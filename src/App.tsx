import { CarDiagram } from "./components/CarDiagram";
import { DriverSwitcher } from "./components/DriverSwitcher";
import { DriverVitals } from "./components/DriverVitals";
import { RaceStatus } from "./components/RaceStatus";
import { TrackMap } from "./components/TrackMap";
import { useRace } from "./state/RaceContext";

function SessionClock() {
  const clock = useRace((s) => s.clock);
  return (
    <span className="tabular font-mono text-sm text-ink-dim">{clock}</span>
  );
}

export default function App() {
  const driverName = useRace((s) => s.driver.name);
  const driverNumber = useRace((s) => s.driver.number);

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-4 border-b border-edge px-4 py-3">
        <img
          src="/assets/apex-racing-mark.svg"
          alt="Apex Racing"
          className="h-8 w-auto"
        />
        <SessionClock />
        <div className="ml-auto flex items-center gap-4">
          <p className="font-mono text-sm tracking-wide">
            <span className="text-ink-faint">#{driverNumber}</span> {driverName}
          </p>
          <DriverSwitcher />
        </div>
      </header>

      <main className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          <RaceStatus />
          <TrackMap />
        </div>
        <CarDiagram />
        <DriverVitals />
      </main>
    </div>
  );
}
