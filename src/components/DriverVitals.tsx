import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";
import { PhysioChart } from "./PhysioChart";

export function DriverVitals() {
  const heartRate = useRace((s) => s.history.heartRate);
  const heartRateNow = useRace((s) => s.driver.heartRateBpm);
  const breathing = useRace((s) => s.history.breathing);
  const breathingNow = useRace((s) => s.driver.breathsPerMin);
  const stress = useRace((s) => s.history.stress);
  const stressNow = useRace((s) => s.driver.stress);

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
        <PhysioChart
          label="Breaths per minute"
          series={breathing}
          value={breathingNow}
          unit="bpm"
          domain={[6, 24]}
          color="var(--color-info)"
          decimals={1}
        />
        <PhysioChart
          label="Stress level"
          series={stress}
          value={stressNow}
          unit="index"
          domain={[0, 100]}
          color="var(--color-caution)"
        />
      </div>
    </Panel>
  );
}
