import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { SeriesPoint } from "../sim/types";

type PhysioChartProps = {
  label: string;
  series: SeriesPoint[];
  value: number;
  unit: string;
  /** Fixed so the line moves against a stable scale instead of rescaling each tick. */
  domain: [number, number];
  color: string;
  decimals?: number;
};

export function PhysioChart({
  label,
  series,
  value,
  unit,
  domain,
  color,
  decimals = 0,
}: PhysioChartProps) {
  const values = series.map((point) => point.value);
  const low = values.length ? Math.min(...values) : 0;
  const high = values.length ? Math.max(...values) : 0;

  return (
    <div className="rounded border border-edge bg-raised p-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="label">{label}</p>
        <p className="tabular font-mono text-lg" style={{ color }}>
          {value.toFixed(decimals)}
          <span className="ml-1 text-xs text-ink-faint">{unit}</span>
        </p>
      </div>

      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
          >
            <YAxis domain={domain} hide />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.6}
              dot={false}
              /* The series is replaced every tick; animating each replacement
                 would mean the line never settles. */
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-1 flex justify-between font-mono text-[10px] text-ink-faint">
        <span>low {low.toFixed(decimals)}</span>
        <span>high {high.toFixed(decimals)}</span>
      </p>
    </div>
  );
}
