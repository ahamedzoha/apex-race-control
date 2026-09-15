import { useEffect, useRef, useState } from "react";
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
  const [preview, setPreview] = useState<TyreCorner | null>(null);

  // Pointer and keyboard both preview a corner, and the selection is what survives
  // once they move away. Two states, not three: hovering and focusing mean the same
  // thing here, and only the focus ring has to tell them apart.
  const active = preview ?? selected;

  const toggle = (corner: TyreCorner) =>
    setSelected((current) => (current === corner ? null : corner));

  const carRef = useRef<HTMLDivElement>(null);

  // A pinned tyre has to be dismissable from anywhere, not only from the tyre that
  // still holds focus. The listeners only exist while something is pinned.
  useEffect(() => {
    if (!selected) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!carRef.current?.contains(event.target as Node)) setSelected(null);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [selected]);

  const tempC = useRace((s) => (active ? s.driver.tyres[active].tempC : null));
  const pressureBar = useRace((s) =>
    active ? s.driver.tyres[active].pressureBar : null,
  );
  const brakeTempC = useRace((s) =>
    active ? s.driver.brakeTempC[active] : null,
  );

  return (
    <Panel title="Car">
      <div
        ref={carRef}
        /* The art is nearly 1:2.3, so sizing by width makes it tower over the
             panel and push the telemetry below the fold. Height drives it, and the
             aspect ratio works the width out. */
        className="relative mx-auto aspect-[800/1836] h-[clamp(240px,42vh,440px)]"
      >
        <img
          src="/assets/f1-car.png"
          alt="Top-down view of the car"
          className="h-full w-full object-contain"
        />

        <svg
          viewBox="0 0 800 1836"
          className="absolute inset-0 h-full w-full"
          onMouseLeave={() => setPreview(null)}
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
                className="cursor-pointer focus-visible:[stroke-dasharray:10_8] focus-visible:[stroke:var(--color-apex)]"
                role="button"
                tabIndex={0}
                aria-label={`${CORNER_NAME[corner]} tyre`}
                aria-pressed={selected === corner}
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
                onMouseEnter={() => setPreview(corner)}
                onFocus={() => setPreview(corner)}
                onBlur={() => setPreview(null)}
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
