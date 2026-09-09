import { useState } from "react";
import type { TyreCorner } from "../sim/types";
import { Panel } from "./Panel";

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

export function CarDiagram() {
  const [selected, setSelected] = useState<TyreCorner | null>(null);
  const [hovered, setHovered] = useState<TyreCorner | null>(null);

  // Hover is a preview; the selection is what survives once the pointer leaves.
  const active = hovered ?? selected;

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
            return (
              <rect
                key={corner}
                x={x}
                y={y}
                width={width}
                height={height}
                rx="24"
                className="cursor-pointer"
                fill={isActive ? "var(--color-apex)" : "transparent"}
                fillOpacity={isActive ? 0.22 : 0}
                stroke={
                  isActive
                    ? "var(--color-apex)"
                    : SHOW_HIT_REGIONS
                      ? "magenta"
                      : "none"
                }
                strokeWidth="4"
                onMouseEnter={() => setHovered(corner)}
                onClick={() =>
                  setSelected((current) => (current === corner ? null : corner))
                }
              />
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}
