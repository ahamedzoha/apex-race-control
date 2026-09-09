import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { createRaceEngine, type RaceEngine } from "../sim/engine";
import type { RaceSnapshot } from "../sim/types";

const RaceContext = createContext<RaceEngine | null>(null);

export function RaceProvider({ children }: { children: ReactNode }) {
  const [engine] = useState(() => createRaceEngine());

  useEffect(() => {
    engine.start();
    return () => engine.stop();
  }, [engine]);

  return <RaceContext value={engine}>{children}</RaceContext>;
}

export function useEngine() {
  const engine = useContext(RaceContext);
  if (!engine) throw new Error("useEngine must be used inside <RaceProvider>");
  return engine;
}

/**
 * Subscribes a component to one slice of the race snapshot.
 *
 * The engine keeps a single snapshot object and swaps it once per tick, so a
 * selector that reads off that object returns the same value for the whole tick.
 * Selectors must therefore return primitives or things that already live on the
 * snapshot — building a new object or array inside a selector would give React a
 * different value on every read and re-render forever.
 */
export function useRace<T>(selector: (snapshot: RaceSnapshot) => T): T {
  const engine = useEngine();
  return useSyncExternalStore(engine.subscribe, () =>
    selector(engine.getSnapshot()),
  );
}
