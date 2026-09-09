import { useEngine, useRace } from "../state/RaceContext";

export function DriverSwitcher() {
  const engine = useEngine();
  const roster = useRace((s) => s.roster);
  const selectedId = useRace((s) => s.selectedDriverId);

  return (
    <div
      className="flex flex-wrap gap-1"
      role="group"
      aria-label="Select driver"
    >
      {roster.map((driver) => {
        const active = driver.id === selectedId;
        return (
          <button
            key={driver.id}
            type="button"
            onClick={() => engine.selectDriver(driver.id)}
            aria-pressed={active}
            className={`rounded border px-2.5 py-1.5 font-mono text-xs tracking-wide transition-colors ${
              active
                ? "border-apex bg-apex/15 text-apex"
                : "border-edge text-ink-dim hover:border-edge-strong hover:text-ink"
            }`}
          >
            <span className="tabular mr-1.5 text-ink-faint">
              {driver.number}
            </span>
            {driver.shortName}
          </button>
        );
      })}
    </div>
  );
}
