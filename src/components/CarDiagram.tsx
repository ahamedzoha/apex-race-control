import { Panel } from "./Panel";

export function CarDiagram() {
  return (
    <Panel title="Car">
      <div className="mx-auto aspect-[800/1836] w-full max-w-[220px]">
        <img
          src="/assets/f1-car.png"
          alt="Top-down view of the car"
          className="h-full w-full object-contain"
        />
      </div>
    </Panel>
  );
}
