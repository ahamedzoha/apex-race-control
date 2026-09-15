import { useRace } from "../state/RaceContext";

/**
 * Narrow screens scroll, so position and lap would spend most of the time off
 * screen. This keeps the two numbers an engineer glances at pinned to the header.
 */
export function StatusBar() {
  const position = useRace((s) => s.driver.position);
  const lap = useRace((s) => s.driver.lap);
  const totalLaps = useRace((s) => s.circuit.totalLaps);
  const shortName = useRace((s) => s.driver.shortName);
  const fuelMarginLaps = useRace((s) => s.driver.fuelMarginLaps);

  return (
    <div className="flex items-center gap-3 border-t border-edge px-3 py-1.5 font-mono text-xs lg:hidden">
      <span className="tabular text-apex">P{position}</span>
      <span className="tabular text-ink-dim">
        L{lap}/{totalLaps}
      </span>
      <span className="truncate text-ink-dim">{shortName}</span>
      <span
        className={`tabular ml-auto ${fuelMarginLaps < 0 ? "text-critical" : "text-ink-faint"}`}
      >
        fuel {fuelMarginLaps >= 0 ? "+" : ""}
        {fuelMarginLaps.toFixed(1)}
      </span>
    </div>
  );
}
