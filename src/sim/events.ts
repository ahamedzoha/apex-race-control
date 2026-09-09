import type { DriverTelemetry, Severity, TyreCorner } from './types'

/**
 * Severity model
 *
 * info      something happened, no action needed (lap completed, DRS available)
 * caution   a value has left its normal band and the engineer should watch it
 * critical  the engineer has to act now, or the car is losing time or damaged
 *
 * Alarms are latched with hysteresis: a rule fires once when it crosses its
 * threshold and only re-arms after the value drops back under `clear`. Without
 * that, a value sitting on the limit floods the feed with duplicates.
 */

export const LIMITS = {
  tyreTempC: { caution: 118, critical: 129, clear: 113 },
  engineTempC: { caution: 124, critical: 132, clear: 119 },
  brakeTempC: { caution: 780, critical: 860, clear: 720 },
  stress: { caution: 74, critical: 88, clear: 66 },
  /** Fuel margin runs the other way: lower is worse. */
  fuelMarginLaps: { caution: 0.2, critical: -1, clear: 0.6 },
} as const

export type Alarm = {
  key: string
  label: string
  detail: string
  severity: Severity
}

const CORNER_LABEL: Record<TyreCorner, string> = {
  fl: 'FRONT LEFT',
  fr: 'FRONT RIGHT',
  rl: 'REAR LEFT',
  rr: 'REAR RIGHT',
}

function band(value: number, limit: { caution: number; critical: number }): Severity | null {
  if (value >= limit.critical) return 'critical'
  if (value >= limit.caution) return 'caution'
  return null
}

/**
 * Compares the driver against every threshold and returns only the alarms that
 * have just changed state. `latched` is updated in place by the caller's engine.
 */
export function evaluateAlarms(driver: DriverTelemetry, latched: Map<string, Severity>): Alarm[] {
  const fired: Alarm[] = []

  const raise = (key: string, severity: Severity | null, build: () => Omit<Alarm, 'key' | 'severity'>) => {
    const current = latched.get(key)
    if (!severity) return
    if (current === severity) return
    latched.set(key, severity)
    fired.push({ key, severity, ...build() })
  }

  const release = (key: string, clear: boolean) => {
    if (clear) latched.delete(key)
  }

  for (const corner of Object.keys(driver.tyres) as TyreCorner[]) {
    const tyre = driver.tyres[corner]
    const key = `tyre:${corner}`
    raise(key, band(tyre.tempC, LIMITS.tyreTempC), () => ({
      label: `TYRE TEMPERATURE HIGH — ${CORNER_LABEL[corner]}`,
      detail: `${Math.round(tyre.tempC)}°C · ${tyre.pressureBar.toFixed(2)} bar`,
    }))
    release(key, tyre.tempC < LIMITS.tyreTempC.clear)
  }

  for (const corner of Object.keys(driver.brakeTempC) as TyreCorner[]) {
    const temp = driver.brakeTempC[corner]
    const key = `brake:${corner}`
    raise(key, band(temp, LIMITS.brakeTempC), () => ({
      label: `BRAKE TEMPERATURE HIGH — ${CORNER_LABEL[corner]}`,
      detail: `${Math.round(temp)}°C`,
    }))
    release(key, temp < LIMITS.brakeTempC.clear)
  }

  raise('engine', band(driver.engineTempC, LIMITS.engineTempC), () => ({
    label: 'ENGINE TEMPERATURE HIGH',
    detail: `${driver.engineTempC.toFixed(1)}°C at ${Math.round(driver.rpm)} rpm`,
  }))
  release('engine', driver.engineTempC < LIMITS.engineTempC.clear)

  raise('stress', band(driver.stress, LIMITS.stress), () => ({
    label: 'DRIVER STRESS ELEVATED',
    detail: `${Math.round(driver.stress)} index · ${Math.round(driver.heartRateBpm)} bpm`,
  }))
  release('stress', driver.stress < LIMITS.stress.clear)

  const margin = driver.fuelMarginLaps
  const fuelSeverity: Severity | null =
    margin <= LIMITS.fuelMarginLaps.critical
      ? 'critical'
      : margin <= LIMITS.fuelMarginLaps.caution
        ? 'caution'
        : null
  raise('fuel', fuelSeverity, () => ({
    label: margin <= LIMITS.fuelMarginLaps.critical ? 'FUEL SHORT — LIFT AND COAST' : 'FUEL MARGIN LOW',
    detail: `${margin >= 0 ? '+' : ''}${margin.toFixed(1)} laps at ${driver.fuelPerLapPercent.toFixed(2)}%/lap`,
  }))
  release('fuel', margin > LIMITS.fuelMarginLaps.clear)

  return fired
}
