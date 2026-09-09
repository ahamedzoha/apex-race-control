/**
 * Small maths helpers for the simulator.
 *
 * The aim is behaviour that looks deliberate rather than random: values chase a
 * target instead of jumping, and the target is driven by where the car is on the
 * lap. Noise is added last and kept small.
 */

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Move `current` a fraction of the way to `target`, then add a little jitter. */
export function drift(
  current: number,
  target: number,
  rate: number,
  jitter = 0,
) {
  const next = current + (target - current) * rate;
  return jitter === 0 ? next : next + randomBetween(-jitter, jitter);
}

/**
 * Corner centres as a fraction of a lap, measured from the racing line in
 * `data/trackPath.ts`: the path was sampled and the turning angle per unit length
 * taken, and these are where it peaks. They were hand-authored at first, which put
 * five of them on straights once the track map was drawn.
 */
const CORNERS = [
  0.0, 0.12, 0.159, 0.389, 0.48, 0.544, 0.587, 0.677, 0.709, 0.754, 0.785, 0.84,
  0.87, 0.905,
];

/**
 * Narrow enough that the closest pair (0.84 and 0.87) still reads as two corners,
 * wide enough that the stadium section stays loaded between them.
 */
const CORNER_WIDTH = 0.018;

/** 0 on a straight, 1 in the middle of a corner. */
export function corneringAt(lapProgress: number) {
  let load = 0;
  for (const centre of CORNERS) {
    // Shortest distance around the lap, so the corner at 0.94 still works at 0.01.
    const raw = Math.abs(lapProgress - centre);
    const distance = Math.min(raw, 1 - raw);
    const bump = Math.exp(-((distance / CORNER_WIDTH) ** 2));
    if (bump > load) load = bump;
  }
  return load;
}

/** Throttle follows the inverse of cornering load. */
export function throttleAt(lapProgress: number) {
  return clamp(1 - 0.78 * corneringAt(lapProgress), 0.18, 1);
}

export function formatLapTime(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

export function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = Math.floor(totalSeconds) % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
