type StatProps = {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "apex" | "caution" | "critical";
  size?: "sm" | "md" | "lg";
};

const TONE = {
  default: "text-ink",
  apex: "text-apex",
  caution: "text-caution",
  critical: "text-critical",
};

const SIZE = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

export function Stat({
  label,
  value,
  unit,
  tone = "default",
  size = "md",
}: StatProps) {
  return (
    <div className="min-w-0">
      <p className="label truncate">{label}</p>
      <p className={`tabular font-mono ${SIZE[size]} ${TONE[tone]}`}>
        {value}
        {unit ? (
          <span className="ml-1 text-xs text-ink-faint">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}
