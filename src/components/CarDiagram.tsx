import { useState } from "react";
import { LIMITS } from "../sim/events";
import type { TyreCorner } from "../sim/types";
import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";
import { Stat } from "./Stat";

const TYRE_REGIONS: {
  corner: TyreCorner;
  x: number;
  y: number;
  width: number;
  height: number;
}[] = [
  { corner: "fl", x: 0, y: 246, width: 170, height: 258 },
  { corner: "fr", x: 630, y: 246, width: 170, height: 258 },
  { corner: "rl", x: 0, y: 1408, width: 170, height: 264 },
  { corner: "rr", x: 630, y: 1408, width: 170, height: 264 },
];

/** Flip while adjusting the boxes against the art. */
const SHOW_HIT_REGIONS = false;

const CORNER_NAME: Record<TyreCorner, string> = {
  fl: "Front left",
  fr: "Front right",
  rl: "Rear left",
  rr: "Rear right",
};

function tyreTone(tempC: number) {
  if (tempC >= LIMITS.tyreTempC.critical) return "critical" as const;
  if (tempC >= LIMITS.tyreTempC.caution) return "caution" as const;
  return "default" as const;
}

export function CarDiagram() {
  const [selected, setSelected] = useState<TyreCorner | null>(null);
  const [hovered, setHovered] = useState<TyreCorner | null>(null);
  const [focused, setFocused] = useState<TyreCorner | null>(null);

  const active = hovered ?? focused ?? selected;

  const toggle = (corner: TyreCorner) =>
    setSelected((current) => (current === corner ? null : corner));

  const tempC = useRace((s) => (active ? s.driver.tyres[active].tempC : null));
  const pressureBar = useRace((s) =>
    active ? s.driver.tyres[active].pressureBar : null,
  );
  const brakeTempC = useRace((s) =>
    active ? s.driver.brakeTempC[active] : null,
  );

  return (
    <Panel title="Car">
      <div className="relative mx-auto aspect-[800/1836] w-full max-w-[220px]">
        <img
          src="/assets/f1-car.png"
          alt="Top-down view of the car"
          className="h-full w-full object-contain"
        />

        <svg
          viewBox="0 0 800 1836"
          className="absolute inset-0 h-full w-full"
          onMouseLeave={() => setHovered(null)}
        >
          {TYRE_REGIONS.map(({ corner, x, y, width, height }) => {
            const isActive = corner === active;
            const isFocused = corner === focused;
            return (
              <rect
                key={corner}
                x={x}
                y={y}
                width={width}
                height={height}
                rx="24"
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${CORNER_NAME[corner]} tyre`}
                aria-pressed={selected === corner}
                fill={isActive ? "var(--color-apex)" : "transparent"}
                fillOpacity={isActive ? 0.22 : 0}
                stroke={
                  isActive || isFocused
                    ? "var(--color-apex)"
                    : SHOW_HIT_REGIONS
                      ? "magenta"
                      : "none"
                }
                strokeWidth="4"
                strokeDasharray={
                  isFocused && selected !== corner ? "10 8" : undefined
                }
                onMouseEnter={() => setHovered(corner)}
                onFocus={() => setFocused(corner)}
                onBlur={() => setFocused(null)}
                onClick={() => toggle(corner)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    // Space would scroll the page otherwise.
                    event.preventDefault();
                    toggle(corner);
                  }
                  if (event.key === "Escape") setSelected(null);
                }}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-3 border-t border-edge pt-3">
        {active &&
        tempC !== null &&
        pressureBar !== null &&
        brakeTempC !== null ? (
          <>
            <p className="label mb-2 text-apex">{CORNER_NAME[active]} tyre</p>
            <div className="grid grid-cols-3 gap-3">
              <Stat
                label="Temp"
                value={tempC.toFixed(0)}
                unit="°C"
                tone={tyreTone(tempC)}
              />
              <Stat
                label="Pressure"
                value={pressureBar.toFixed(2)}
                unit="bar"
              />
              <Stat label="Brake" value={brakeTempC.toFixed(0)} unit="°C" />
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-faint">
            Hover a tyre for a reading, tap to keep it on screen.
          </p>
        )}
      </div>
    </Panel>
  );
}
