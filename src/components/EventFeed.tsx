import type { Severity } from "../sim/types";
import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";

const SEVERITY_STYLE: Record<Severity, { bar: string; text: string }> = {
  info: { bar: "bg-edge-strong", text: "text-ink-dim" },
  caution: { bar: "bg-caution", text: "text-caution" },
  critical: { bar: "bg-critical", text: "text-critical" },
};

export function EventFeed() {
  const events = useRace((s) => s.events);
  const selectedDriverId = useRace((s) => s.selectedDriverId);

  // Events carry the driver they belong to; session-wide ones carry no driver and
  // stay visible whoever is selected.
  const visible = events
    .filter(
      (event) => event.driverId === "" || event.driverId === selectedDriverId,
    )
    .slice(0, 20);

  return (
    <Panel title="Race control">
      {visible.length === 0 ? (
        <p className="text-xs text-ink-faint">Waiting for the first event.</p>
      ) : (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[22rem]">
          {visible.map((event) => {
            const style = SEVERITY_STYLE[event.severity];
            return (
              <li key={event.id} className="flex gap-2.5">
                <span className={`mt-1 w-0.5 shrink-0 rounded ${style.bar}`} />
                <div className="min-w-0 flex-1">
                  <p className={`font-mono text-xs ${style.text}`}>
                    {event.label}
                  </p>
                  <p className="tabular font-mono text-[10px] text-ink-faint">
                    {/* Session-wide events belong to the race, not to a lap. */}
                    {event.clock}
                    {event.lap ? ` · lap ${event.lap}` : ""}
                    {event.detail ? ` · ${event.detail}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
