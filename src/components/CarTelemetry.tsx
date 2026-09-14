import { LIMITS } from "../sim/events";
import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";
import { TelemetryBar } from "./TelemetryBar";

export function CarTelemetry() {
  const rpm = useRace((s) => s.driver.rpm);
  const engineTempC = useRace((s) => s.driver.engineTempC);
  const fuelPercent = useRace((s) => s.driver.fuelPercent);
  const fuelMarginLaps = useRace((s) => s.driver.fuelMarginLaps);
  const fuelPerLap = useRace((s) => s.driver.fuelPerLapPercent);

  const engineColor =
    engineTempC >= LIMITS.engineTempC.critical
      ? "var(--color-critical)"
      : engineTempC >= LIMITS.engineTempC.caution
        ? "var(--color-caution)"
        : "var(--color-apex)";

  const marginColor =
    fuelMarginLaps <= LIMITS.fuelMarginLaps.critical
      ? "var(--color-critical)"
      : fuelMarginLaps <= LIMITS.fuelMarginLaps.caution
        ? "var(--color-caution)"
        : "var(--color-ok)";

  return (
    <Panel title="Car telemetry">
      <div className="flex flex-col gap-4">
        <TelemetryBar
          label="RPM"
          value={rpm}
          unit=""
          domain={[0, 12000]}
          color="var(--color-apex)"
        />
        <TelemetryBar
          label="Engine temp"
          value={engineTempC}
          unit="°C"
          domain={[0, 150]}
          color={engineColor}
          decimals={1}
        />
        <TelemetryBar
          label="Fuel"
          value={fuelPercent}
          unit="%"
          domain={[0, 100]}
          color="var(--color-apex)"
          decimals={1}
        />

        <div className="border-t border-edge pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="label">Fuel margin</p>
            <p
              className="tabular font-mono text-lg"
              style={{ color: marginColor }}
            >
              {fuelMarginLaps >= 0 ? "+" : ""}
              {fuelMarginLaps.toFixed(1)}
              <span className="ml-1 text-xs text-ink-faint">laps</span>
            </p>
          </div>
          <p className="mt-1 text-xs text-ink-faint">
            Fuel in the tank minus fuel needed to the flag, at{" "}
            {fuelPerLap.toFixed(2)}% per lap. Negative means lift and coast.
          </p>
        </div>
      </div>
    </Panel>
  );
}
