export type TyreCorner = "fl" | "fr" | "rl" | "rr";

export type Severity = "info" | "caution" | "critical";

export type Tyre = {
  tempC: number;
  pressureBar: number;
};

export type DriverTelemetry = {
  id: string;
  name: string;
  shortName: string;
  number: number;
  team: string;

  position: number;
  lap: number;
  lapProgress: number;
  speedKmh: number;
  topSpeedKmh: number;
  currentLapMs: number;
  lastLapMs: number | null;
  bestLapMs: number;

  rpm: number;
  engineTempC: number;
  fuelPercent: number;
  fuelPerLapPercent: number;
  /** Laps of fuel left minus laps of race left. Negative means lift-and-coast. */
  fuelMarginLaps: number;

  tyres: Record<TyreCorner, Tyre>;
  brakeTempC: Record<TyreCorner, number>;

  heartRateBpm: number;
  breathsPerMin: number;
  stress: number;
};

export type CarMarker = {
  id: string;
  label: string;
  position: number;
  lapProgress: number;
  isTeam: boolean;
};

export type Weather = {
  airTempC: number;
  trackTempC: number;
  cloudCoverPercent: number;
  humidityPercent: number;
  pressureMb: number;
  windSpeedKmh: number;
};

export type RaceEvent = {
  id: number;
  clock: string;
  lap: number;
  driverId: string;
  label: string;
  detail?: string;
  severity: Severity;
};

export type SeriesPoint = {
  t: number;
  clock: string;
  value: number;
};

export type DriverHistory = {
  heartRate: SeriesPoint[];
  breathing: SeriesPoint[];
  stress: SeriesPoint[];
};

export type Circuit = {
  name: string;
  country: string;
  totalLaps: number;
};

export type RaceSnapshot = {
  tick: number;
  clock: string;
  running: boolean;
  tickMs: number;
  circuit: Circuit;
  selectedDriverId: string;
  driver: DriverTelemetry;
  roster: DriverTelemetry[];
  markers: CarMarker[];
  history: DriverHistory;
  weather: Weather;
  events: RaceEvent[];
};
