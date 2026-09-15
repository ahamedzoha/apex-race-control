import { CarDiagram } from "./components/CarDiagram";
import { CarTelemetry } from "./components/CarTelemetry";
import { DriverSwitcher } from "./components/DriverSwitcher";
import { DriverVitals } from "./components/DriverVitals";
import { EventFeed } from "./components/EventFeed";
import { RaceStatus } from "./components/RaceStatus";
import { StatusBar } from "./components/StatusBar";
import { TrackMap } from "./components/TrackMap";
import { Weather } from "./components/Weather";
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
      <header className="sticky top-0 z-10 border-b border-edge bg-ground/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 md:px-4">
          <img
            src="/assets/apex-racing-mark.svg"
            alt="Apex Racing"
            className="h-7 w-auto md:h-8"
          />
          <SessionClock />
          <p className="hidden font-mono text-sm tracking-wide md:block">
            <span className="text-ink-faint">#{driverNumber}</span> {driverName}
          </p>
          <div className="ml-auto">
            <DriverSwitcher />
          </div>
        </div>
        <StatusBar />
      </header>

      {/* Hierarchy changes per tier rather than the desktop layout shrinking:
          the car leads on a phone because it is the thing you touch, three
          columns only appear once there is room for all of them side by side. */}
      <main className="grid gap-3 p-3 md:p-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="order-1 flex min-w-0 flex-col gap-3 lg:order-2">
          <CarDiagram />
          <CarTelemetry />
        </div>
        <div className="order-2 flex min-w-0 flex-col gap-3 lg:order-1">
          <RaceStatus />
          <TrackMap />
          <Weather />
        </div>
        <div className="order-3 grid min-w-0 gap-3 lg:col-span-2 lg:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
          <DriverVitals />
          <EventFeed />
        </div>
      </main>
    </div>
  );
}
