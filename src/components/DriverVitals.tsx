import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";
import { PhysioChart } from "./PhysioChart";

export function DriverVitals() {
  const heartRate = useRace((s) => s.history.heartRate);
  const heartRateNow = useRace((s) => s.driver.heartRateBpm);

  return (
    <Panel title="Driver">
      <div className="flex flex-col gap-3">
        <PhysioChart
          label="Heart rate"
          series={heartRate}
          value={heartRateNow}
          unit="bpm"
          domain={[40, 200]}
          color="var(--color-critical)"
        />
      </div>
    </Panel>
  );
}
