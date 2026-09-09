import { formatLapTime } from "../sim/signals";
import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";
import { Stat } from "./Stat";

export function RaceStatus() {
  const position = useRace((s) => s.driver.position);
  const lap = useRace((s) => s.driver.lap);
  const totalLaps = useRace((s) => s.circuit.totalLaps);
  const circuit = useRace((s) => s.circuit.name);
  const country = useRace((s) => s.circuit.country);
  const currentLapMs = useRace((s) => s.driver.currentLapMs);
  const bestLapMs = useRace((s) => s.driver.bestLapMs);
  const lastLapMs = useRace((s) => s.driver.lastLapMs);
  const topSpeed = useRace((s) => s.driver.topSpeedKmh);

  const delta = lastLapMs === null ? null : (lastLapMs - bestLapMs) / 1000;

  return (
    <Panel
      title="Race status"
      accessory={
        <span className="font-mono text-xs text-ink-dim">
          {circuit} · {country}
        </span>
      }
    >
      <div className="flex items-start gap-4">
        <div className="rounded border border-apex-dim bg-apex/10 px-3 py-2 text-center">
          <p className="label">Pos</p>
          <p className="tabular font-mono text-3xl leading-none text-apex">
            P{position}
          </p>
        </div>
        <div className="flex-1">
          <p className="label">Lap</p>
          <p className="tabular font-mono text-3xl leading-none">
            {lap}
            <span className="text-lg text-ink-faint">/{totalLaps}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Current lap" value={formatLapTime(currentLapMs)} />
        <Stat
          label="Last lap"
          value={lastLapMs === null ? "—" : formatLapTime(lastLapMs)}
          tone={delta !== null && delta <= 0 ? "apex" : "default"}
        />
        <Stat label="Best lap" value={formatLapTime(bestLapMs)} tone="apex" />
      </div>

      <div className="mt-3 border-t border-edge pt-3">
        <Stat
          label="Top speed"
          value={topSpeed.toFixed(0)}
          unit="km/h"
          size="sm"
        />
      </div>
    </Panel>
  );
}
