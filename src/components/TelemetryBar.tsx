import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

type TelemetryBarProps = {
  label: string;
  value: number;
  unit: string;
  domain: [number, number];
  color: string;
  decimals?: number;
};

export function TelemetryBar({
  label,
  value,
  unit,
  domain,
  color,
  decimals = 0,
}: TelemetryBarProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="label">{label}</p>
        <p className="tabular font-mono text-sm" style={{ color }}>
          {value.toFixed(decimals)}
          <span className="ml-1 text-[10px] text-ink-faint">{unit}</span>
        </p>
      </div>

      <div className="h-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={[{ value }]}
            margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis type="number" domain={domain} hide />
            <YAxis type="category" hide />
            <Bar
              dataKey="value"
              fill={color}
              radius={2}
              isAnimationActive={false}
              background={{ fill: "var(--color-edge)", radius: 2 }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
