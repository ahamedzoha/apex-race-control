import { useRace } from "../state/RaceContext";
import { Panel } from "./Panel";
import { Stat } from "./Stat";

export function Weather() {
  const airTempC = useRace((s) => s.weather.airTempC);
  const trackTempC = useRace((s) => s.weather.trackTempC);
  const cloudCoverPercent = useRace((s) => s.weather.cloudCoverPercent);
  const humidityPercent = useRace((s) => s.weather.humidityPercent);
  const pressureMb = useRace((s) => s.weather.pressureMb);
  const windSpeedKmh = useRace((s) => s.weather.windSpeedKmh);

  // The supplied icons are drawn in currentColor, which an <img> cannot inherit,
  // so they are inverted to read on the dark panel.
  const icon = cloudCoverPercent > 45 ? "weather-cloud" : "weather-sun";

  return (
    <Panel
      title="Weather"
      accessory={
        <img
          src={`/assets/icons/${icon}.svg`}
          alt=""
          className="h-4 w-4 opacity-70 invert"
        />
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Air" value={airTempC.toFixed(1)} unit="°C" size="sm" />
        <Stat label="Track" value={trackTempC.toFixed(1)} unit="°C" size="sm" />
        <Stat
          label="Cloud"
          value={cloudCoverPercent.toFixed(0)}
          unit="%"
          size="sm"
        />
        <Stat
          label="Humidity"
          value={humidityPercent.toFixed(0)}
          unit="%"
          size="sm"
        />
        <Stat
          label="Pressure"
          value={pressureMb.toFixed(0)}
          unit="mb"
          size="sm"
        />
        <Stat
          label="Wind"
          value={windSpeedKmh.toFixed(1)}
          unit="km/h"
          size="sm"
        />
      </div>
    </Panel>
  );
}
