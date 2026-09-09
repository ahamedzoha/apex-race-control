import { useEffect, useRef, useState } from "react";
import { TRACK_PATH_D, TRACK_VIEWBOX } from "../data/trackPath";
import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";

export function TrackMap() {
  const markers = useRace((s) => s.markers);
  const selectedId = useRace((s) => s.selectedDriverId);
  const circuit = useRace((s) => s.circuit.name);

  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  // The racing line is drawn by us, so its length is only known once it is mounted.
  useEffect(() => {
    if (pathRef.current) setPathLength(pathRef.current.getTotalLength());
  }, []);

  const path = pathRef.current;
  const placed =
    path && pathLength > 0
      ? markers.map((marker) => {
          const point = path.getPointAtLength(marker.lapProgress * pathLength);
          return { ...marker, x: point.x, y: point.y };
        })
      : [];

  return (
    <Panel
      title="Circuit"
      accessory={
        <span className="flex items-center gap-2 font-mono text-xs text-ink-dim">
          <img src="/assets/icons/flag-de.svg" alt="" className="h-3 w-auto" />
          {circuit}
        </span>
      }
    >
      <svg
        viewBox={TRACK_VIEWBOX}
        className="w-full"
        role="img"
        aria-label={`${circuit} circuit with live car positions`}
      >
        {/* Soft copy underneath gives the line its glow without a filter. */}
        <path
          d={TRACK_PATH_D}
          fill="none"
          stroke="var(--color-apex)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.12"
        />
        <path
          ref={pathRef}
          d={TRACK_PATH_D}
          fill="none"
          stroke="var(--color-apex)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />

        {placed.map((marker) => {
          const isSelected = marker.id === selectedId;
          const fill = isSelected
            ? "var(--color-apex)"
            : marker.isTeam
              ? "var(--color-ink-dim)"
              : "var(--color-ink-faint)";

          return (
            <g key={marker.id} transform={`translate(${marker.x} ${marker.y})`}>
              {isSelected ? (
                <circle r="7" fill="var(--color-apex)" opacity="0.18" />
              ) : null}
              <circle r={isSelected ? 3.6 : 2.4} fill={fill} />
              {isSelected ? (
                <text
                  x="10"
                  y="3"
                  fontSize="8"
                  fill="var(--color-apex)"
                  fontFamily="var(--font-mono)"
                >
                  {marker.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}
