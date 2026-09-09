import seed from "../data/drivers.json";
import { evaluateAlarms } from "./events";
import {
  clamp,
  corneringAt,
  drift,
  formatClock,
  randomBetween,
  throttleAt,
} from "./signals";
import type {
  CarMarker,
  DriverHistory,
  DriverTelemetry,
  RaceEvent,
  RaceSnapshot,
  Severity,
  TyreCorner,
  Weather,
} from "./types";

export const DEFAULT_TICK_MS = 700;

/** Sim seconds per real second. A lap is around 83s of race time, around 14s on screen. */
const TIME_SCALE = 6;
const BASE_LAP_SECONDS = 83;
/** Mean speed the corner model actually produces, so a lap lands near BASE_LAP_SECONDS. */
const AVERAGE_SPEED_KMH = 237;

/**
 * Motion is integrated in smaller steps than the tick. Speed depends on track
 * position and position is integrated from speed, so stepping the whole 4.2s tick
 * at once locks every lap onto a whole number of ticks: all three drivers came out
 * at exactly 84.000s whatever their pace.
 */
const MOTION_SUBSTEPS = 4;
const SPEED_RESPONSE = 0.6;
const SPEED_SUBSTEP_RESPONSE =
  1 - Math.pow(1 - SPEED_RESPONSE, 1 / MOTION_SUBSTEPS);
const HISTORY_POINTS = 60;
const EVENT_LIMIT = 40;
const SESSION_START_SECONDS = 10 * 3600 + 15 * 60;

const CORNERS: TyreCorner[] = ["fl", "fr", "rl", "rr"];

/** Per-driver character. Same car, different style, so the numbers diverge. */
type Style = {
  pace: number;
  aggression: number;
  fuelPerLapPercent: number;
  tyreBias: Record<TyreCorner, number>;
};

const STYLES: Record<string, Style> = {
  "nova-07": {
    pace: 1.012,
    aggression: 0.9,
    fuelPerLapPercent: 1.42,
    tyreBias: { fl: 12, fr: 7, rl: 3, rr: 4 },
  },
  "vek-22": {
    pace: 1.0,
    aggression: 1.15,
    fuelPerLapPercent: 1.58,
    tyreBias: { fl: 16, fr: 12, rl: 6, rr: 7 },
  },
  "rine-44": {
    pace: 0.988,
    aggression: 0.78,
    fuelPerLapPercent: 1.3,
    tyreBias: { fl: 8, fr: 5, rl: 2, rr: 2 },
  },
};

type DriverRuntime = {
  telemetry: DriverTelemetry;
  style: Style;
  history: DriverHistory;
  latched: Map<string, Severity>;
  /** Cars join the session mid-lap, so the first wrap is not a timed lap. */
  hasTimedFullLap: boolean;
};

/** Cars we do not have telemetry for. They exist so gaps and positions mean something. */
type Rival = {
  id: string;
  label: string;
  pace: number;
  lap: number;
  lapProgress: number;
};

function pushPoint(
  series: { t: number; clock: string; value: number }[],
  tick: number,
  clock: string,
  value: number,
) {
  series.push({ t: tick, clock, value });
  if (series.length > HISTORY_POINTS) series.shift();
}

function buildDriver(entry: (typeof seed.drivers)[number]): DriverRuntime {
  const style = STYLES[entry.id];
  const base = entry.baseline;
  const tyres = {} as DriverTelemetry["tyres"];
  const brakeTempC = {} as DriverTelemetry["brakeTempC"];
  for (const corner of CORNERS) {
    tyres[corner] = {
      tempC: base.tyres[corner].tempC,
      pressureBar: base.tyres[corner].pressureBar,
    };
    brakeTempC[corner] = base.brakes[corner].tempC;
  }

  return {
    style,
    history: { heartRate: [], breathing: [], stress: [] },
    latched: new Map(),
    hasTimedFullLap: false,
    telemetry: {
      id: entry.id,
      name: entry.name,
      shortName: entry.shortName,
      number: entry.number,
      team: entry.team,
      position: base.position,
      lap: base.lap,
      lapProgress: randomBetween(0.05, 0.6),
      speedKmh: 240,
      topSpeedKmh: base.topSpeedKmh,
      currentLapMs: 0,
      // The seed gives each driver a best lap, so the session already has history.
      // Show a plausible last lap alongside it rather than a gap until lap two.
      lastLapMs: parseLapTime(base.bestLap) + randomBetween(300, 1800),
      bestLapMs: parseLapTime(base.bestLap),
      rpm: base.rpm,
      engineTempC: base.engineTempC,
      fuelPercent: base.fuelPercent,
      fuelPerLapPercent: style.fuelPerLapPercent,
      fuelMarginLaps: 0,
      tyres,
      brakeTempC,
      heartRateBpm: base.heartRateBpm,
      breathsPerMin: base.breathsPerMin,
      stress: base.stress,
    },
  };
}

function parseLapTime(value: string) {
  const [minutes, rest] = value.split(":");
  return Number(minutes) * 60000 + Math.round(Number(rest) * 1000);
}

export type RaceEngine = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RaceSnapshot;
  selectDriver: (id: string) => void;
  setTickMs: (ms: number) => void;
  setRunning: (running: boolean) => void;
  start: () => void;
  stop: () => void;
};

export function createRaceEngine(tickMs = DEFAULT_TICK_MS): RaceEngine {
  const drivers = seed.drivers.map(buildDriver);
  const byId = new Map(drivers.map((d) => [d.telemetry.id, d]));

  const rivals: Rival[] = [
    { id: "rival-1", label: "P2", pace: 1.006, lap: 16, lapProgress: 0.42 },
    { id: "rival-2", label: "P4", pace: 0.995, lap: 16, lapProgress: 0.77 },
    { id: "rival-3", label: "P6", pace: 0.982, lap: 15, lapProgress: 0.18 },
  ];

  const weather: Weather = {
    airTempC: seed.weatherBaseline.airTempC,
    trackTempC: seed.weatherBaseline.airTempC + 14,
    cloudCoverPercent: seed.weatherBaseline.cloudCoverPercent,
    humidityPercent: seed.weatherBaseline.humidityPercent,
    pressureMb: seed.weatherBaseline.pressureMb,
    windSpeedKmh: seed.weatherBaseline.windSpeedKmh,
  };

  let clock = SESSION_START_SECONDS;
  let tick = 0;
  let eventId = 0;
  let running = true;
  let currentTickMs = tickMs;
  let selectedDriverId = drivers[0].telemetry.id;
  let events: RaceEvent[] = [];
  let timer: number | undefined;
  let snapshot: RaceSnapshot;

  const listeners = new Set<() => void>();

  function addEvent(
    driverId: string,
    label: string,
    severity: Severity,
    detail?: string,
  ) {
    const driver = byId.get(driverId);
    events = [
      {
        id: eventId++,
        clock: formatClock(clock),
        lap: driver ? driver.telemetry.lap : 0,
        driverId,
        label,
        detail,
        severity,
      },
      ...events,
    ].slice(0, EVENT_LIMIT);
  }

  function advanceWeather(dt: number) {
    // Air temperature wanders around the session baseline instead of walking away from it.
    weather.airTempC = clamp(
      drift(weather.airTempC, seed.weatherBaseline.airTempC, 0.01, 0.03),
      18,
      31,
    );
    weather.cloudCoverPercent = clamp(
      weather.cloudCoverPercent + randomBetween(-0.6, 0.6) * dt * 0.2,
      0,
      92,
    );
    weather.humidityPercent = clamp(
      weather.humidityPercent + randomBetween(-0.4, 0.4) * dt * 0.2,
      34,
      96,
    );
    weather.pressureMb = clamp(
      weather.pressureMb + randomBetween(-0.05, 0.05) * dt * 0.2,
      995,
      1030,
    );
    // Wind gusts and settles rather than wandering.
    const gust = Math.random() < 0.03 ? randomBetween(2, 7) : 0;
    weather.windSpeedKmh = clamp(
      drift(weather.windSpeedKmh, 7 + gust, 0.08, 0.15),
      0,
      42,
    );
    weather.trackTempC = drift(
      weather.trackTempC,
      weather.airTempC + 15 - weather.cloudCoverPercent * 0.06,
      0.02,
    );
  }

  /** Speed, lap progress, lap timing and fuel burn, stepped MOTION_SUBSTEPS times. */
  function advanceMotion(runtime: DriverRuntime, dt: number) {
    const d = runtime.telemetry;
    const { style } = runtime;
    const stepSeconds = dt / MOTION_SUBSTEPS;
    const stepMs = stepSeconds * 1000;
    let fuelUsed = 0;

    for (let step = 0; step < MOTION_SUBSTEPS; step += 1) {
      const throttle = throttleAt(d.lapProgress);
      d.speedKmh = drift(
        d.speedKmh,
        (78 + 244 * throttle) * style.pace,
        SPEED_SUBSTEP_RESPONSE,
        1.2 / MOTION_SUBSTEPS,
      );
      if (d.speedKmh > d.topSpeedKmh) d.topSpeedKmh = d.speedKmh;

      // Lap progress comes out of speed, so lap time is a result of the drive.
      const progressDelta =
        (d.speedKmh / AVERAGE_SPEED_KMH) * (stepSeconds / BASE_LAP_SECONDS);
      const progressBefore = d.lapProgress;
      d.lapProgress += progressDelta;
      fuelUsed += style.fuelPerLapPercent * progressDelta;

      if (d.lapProgress < 1) {
        d.currentLapMs += stepMs;
        continue;
      }

      // The line is crossed part way through a step, so interpolate the crossing
      // and carry the remainder of the step into the next lap.
      const crossedAt = (1 - progressBefore) / progressDelta;
      const lapMs = d.currentLapMs + stepMs * crossedAt;

      d.lapProgress -= 1;
      d.lap += 1;

      if (runtime.hasTimedFullLap) {
        d.lastLapMs = lapMs;
        const improved = lapMs < d.bestLapMs;
        if (improved) d.bestLapMs = lapMs;
        addEvent(
          d.id,
          improved ? "PERSONAL BEST LAP" : "LAP COMPLETED",
          "info",
          formatLapDelta(lapMs, d.bestLapMs),
        );
      } else {
        // Started part way through a lap, so timing it would set a nonsense best.
        runtime.hasTimedFullLap = true;
        addEvent(d.id, "LAP COMPLETED", "info");
      }

      d.currentLapMs = stepMs * (1 - crossedAt);
    }

    d.fuelPercent = clamp(d.fuelPercent - fuelUsed, 0, 100);
  }

  function advanceDriver(runtime: DriverRuntime, dt: number) {
    const d = runtime.telemetry;
    const { style } = runtime;

    advanceMotion(runtime, dt);

    const load = corneringAt(d.lapProgress);
    const throttle = throttleAt(d.lapProgress);

    d.rpm = drift(d.rpm, 5200 + 5600 * throttle * style.pace, 0.42, 55);
    d.engineTempC = drift(
      d.engineTempC,
      96 + 27 * throttle + (weather.airTempC - 23) * 0.7,
      0.05,
      0.12,
    );

    for (const corner of CORNERS) {
      const tyre = d.tyres[corner];
      const target =
        86 +
        32 * load * style.aggression +
        style.tyreBias[corner] +
        (weather.trackTempC - 37) * 0.5 -
        (1 - load) * 3;
      tyre.tempC = drift(tyre.tempC, target, 0.045, 0.25);
      tyre.pressureBar =
        1.02 + (tyre.tempC - 90) * 0.008 + randomBetween(-0.004, 0.004);

      const frontBias = corner === "fl" || corner === "fr" ? 1.12 : 0.86;
      d.brakeTempC[corner] = drift(
        d.brakeTempC[corner],
        (250 + 520 * load) * frontBias * style.aggression,
        0.14,
        3,
      );
    }

    // Occasional lockup under braking: one corner spikes, then recovers on its own.
    if (load > 0.55 && Math.random() < 0.006 * style.aggression) {
      const corner: TyreCorner = Math.random() < 0.5 ? "fl" : "fr";
      d.tyres[corner].tempC += randomBetween(14, 26);
      d.brakeTempC[corner] += randomBetween(90, 190);
      d.stress += 7;
      addEvent(
        d.id,
        "LOCKUP UNDER BRAKING",
        "caution",
        `${corner.toUpperCase()} · flat spot risk`,
      );
    }

    const hottestTyre = Math.max(
      ...CORNERS.map((corner) => d.tyres[corner].tempC),
    );
    const tyrePenalty = Math.max(0, hottestTyre - 110) * 1.3;
    const positionPressure = (7 - clamp(d.position, 1, 7)) * 1.4;
    d.stress = clamp(
      drift(
        d.stress,
        30 + 20 * load + tyrePenalty + positionPressure,
        0.05,
        0.4,
      ),
      0,
      100,
    );

    d.heartRateBpm = drift(
      d.heartRateBpm,
      58 + d.stress * 0.42 + load * 16,
      0.22,
      1.1,
    );
    d.breathsPerMin = drift(
      d.breathsPerMin,
      9 + d.stress * 0.055 + load * 4.2,
      0.18,
      0.15,
    );

    const lapsRemaining = seed.circuit.totalLaps - d.lap + (1 - d.lapProgress);
    d.fuelMarginLaps = d.fuelPercent / style.fuelPerLapPercent - lapsRemaining;
  }

  function formatLapDelta(lapMs: number, bestMs: number) {
    const delta = (lapMs - bestMs) / 1000;
    return `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}s vs best`;
  }

  function advanceRivals(dt: number) {
    for (const rival of rivals) {
      const load = corneringAt(rival.lapProgress);
      const speed =
        (78 + 244 * throttleAt(rival.lapProgress)) *
        rival.pace *
        (1 - load * 0.02);
      rival.lapProgress +=
        (speed / AVERAGE_SPEED_KMH) * (dt / BASE_LAP_SECONDS);
      if (rival.lapProgress >= 1) {
        rival.lapProgress -= 1;
        rival.lap += 1;
      }
    }
  }

  function rankPositions() {
    const field = [
      ...drivers.map((d) => ({
        id: d.telemetry.id,
        distance: d.telemetry.lap + d.telemetry.lapProgress,
      })),
      ...rivals.map((r) => ({ id: r.id, distance: r.lap + r.lapProgress })),
    ].sort((a, b) => b.distance - a.distance);

    field.forEach((entry, index) => {
      const runtime = byId.get(entry.id);
      if (runtime) runtime.telemetry.position = index + 1;
    });
  }

  function buildSnapshot(): RaceSnapshot {
    const selected = byId.get(selectedDriverId) ?? drivers[0];
    const markers: CarMarker[] = [
      ...drivers.map((d) => ({
        id: d.telemetry.id,
        label: d.telemetry.shortName,
        position: d.telemetry.position,
        lapProgress: d.telemetry.lapProgress,
        isTeam: true,
      })),
      ...rivals.map((r) => ({
        id: r.id,
        label: r.label,
        position: 0,
        lapProgress: r.lapProgress,
        isTeam: false,
      })),
    ];

    return {
      tick,
      clock: formatClock(clock),
      running,
      tickMs: currentTickMs,
      circuit: seed.circuit,
      selectedDriverId,
      driver: selected.telemetry,
      roster: drivers.map((d) => d.telemetry),
      markers,
      history: selected.history,
      weather,
      events,
    };
  }

  function step() {
    const dt = (currentTickMs / 1000) * TIME_SCALE;
    tick += 1;
    clock += dt;

    advanceWeather(dt);
    for (const runtime of drivers) advanceDriver(runtime, dt);
    advanceRivals(dt);
    rankPositions();

    const stamp = formatClock(clock);
    for (const runtime of drivers) {
      const d = runtime.telemetry;
      pushPoint(
        runtime.history.heartRate,
        tick,
        stamp,
        Math.round(d.heartRateBpm),
      );
      pushPoint(
        runtime.history.breathing,
        tick,
        stamp,
        Number(d.breathsPerMin.toFixed(1)),
      );
      pushPoint(runtime.history.stress, tick, stamp, Math.round(d.stress));

      for (const alarm of evaluateAlarms(d, runtime.latched)) {
        addEvent(d.id, alarm.label, alarm.severity, alarm.detail);
      }
    }

    // Rare session-wide events. They belong to the race, not to one driver.
    if (Math.random() < 0.012)
      addEvent(
        "",
        "YELLOW FLAG — TURN 6",
        "caution",
        "Debris reported trackside",
      );
    if (Math.random() < 0.02)
      addEvent("", "DRS ENABLED — MAIN STRAIGHT", "info");

    snapshot = buildSnapshot();
    for (const listener of listeners) listener();
  }

  function schedule() {
    window.clearInterval(timer);
    if (!running) return;
    timer = window.setInterval(step, currentTickMs);
  }

  // Seed the history so charts have a shape before the first tick lands.
  for (const runtime of drivers) {
    const d = runtime.telemetry;
    for (let i = 0; i < 12; i += 1) {
      const stamp = formatClock(clock - (12 - i) * 4);
      pushPoint(
        runtime.history.heartRate,
        i - 12,
        stamp,
        Math.round(d.heartRateBpm + randomBetween(-3, 3)),
      );
      pushPoint(
        runtime.history.breathing,
        i - 12,
        stamp,
        Number((d.breathsPerMin + randomBetween(-0.6, 0.6)).toFixed(1)),
      );
      pushPoint(
        runtime.history.stress,
        i - 12,
        stamp,
        Math.round(d.stress + randomBetween(-4, 4)),
      );
    }
  }

  rankPositions();
  snapshot = buildSnapshot();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    selectDriver(id) {
      if (!byId.has(id) || id === selectedDriverId) return;
      selectedDriverId = id;
      snapshot = buildSnapshot();
      for (const listener of listeners) listener();
    },
    setTickMs(ms) {
      currentTickMs = ms;
      snapshot = buildSnapshot();
      schedule();
      for (const listener of listeners) listener();
    },
    setRunning(next) {
      running = next;
      snapshot = buildSnapshot();
      schedule();
      for (const listener of listeners) listener();
    },
    start: schedule,
    stop() {
      window.clearInterval(timer);
      timer = undefined;
    },
  };
}
