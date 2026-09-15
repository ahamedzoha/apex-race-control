import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  accessory?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({
  title,
  accessory,
  children,
  className = "",
}: PanelProps) {
  return (
    <section
      className={`flex flex-col rounded-md border border-edge bg-panel ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-edge px-3 py-2">
        <h2 className="label">{title}</h2>
        {accessory}
      </header>
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}
