# Apex Racing, Race Control

A live race control screen for a Formula 1 race engineer. Everything on it is
simulated in the browser. There is no backend and no network calls.

Live: https://apex-race-control.vercel.app/

[![The dashboard at desktop width, with the front left tyre selected](docs/preview.png)](https://youtu.be/D3z7ruE-GEs)

Walkthrough video: https://youtu.be/D3z7ruE-GEs

## 1. How to run

```sh
pnpm install
pnpm dev
```

Then open http://localhost:5173.

Node 20 or newer. pnpm 9 or newer (npm works too, `npm install && npm run dev`).

For a production build:

```sh
pnpm build
pnpm preview
```

Nothing to configure. No environment variables, no API keys.

## 2. Overview

The screen is built around one driver at a time. The car sits in the middle
because it is the thing you interact with, and the four tyres are clickable for
temperature, pressure and brake temperature. Race status and the circuit are on
the left, driver vitals and the race control feed on the right. A simulator ticks
every 700ms and pushes new values into all of it, so lap times, tyre wear,
weather and events keep moving. You can switch between three drivers and the
whole board follows.

## 3. Architecture

```
src/
  sim/        the race simulation, plain TypeScript, no React
    types.ts      the snapshot shape the UI reads
    signals.ts    maths helpers, the corner model, time formatting
    events.ts     severity levels and the threshold alarms
    engine.ts     the tick loop, drivers, rivals, weather, events
  state/
    RaceContext.tsx   provider plus the useRace selector hook
  components/   one panel per area of the screen
  data/         seed drivers from the pack, and the racing line path
```

The simulation does not know React exists. `createRaceEngine()` holds mutable
state, advances it on a timer, and keeps one snapshot object that it swaps once
per tick. React subscribes to that with `useSyncExternalStore`, through a small
hook:

```ts
const rpm = useRace((s) => s.driver.rpm)
```

Each component picks the slice it needs, so a tick re-renders the panels whose
numbers changed rather than the whole app.

One rule comes with that. A selector has to return a primitive, or something
that already lives on the snapshot. If it builds a new object, React compares it
with `Object.is`, never sees a match, and re-renders forever.

## 4. Live data simulation

**Tick rate.** 700ms. One tick is six seconds of race time, so a lap of about 83
seconds takes roughly 14 seconds to watch. Without that speed up you would sit
through a minute and a half of dashboard before a lap counter moved.

**How values move.** Nothing jumps. Every value chases a target with
`drift(current, target, rate)` and picks up a small amount of noise. The rate is
how quickly that channel reacts. Speed is 0.6, tyre temperature is 0.045,
because a tyre has thermal mass and takes many ticks to heat up.

**Where the targets come from.** `corneringAt(lapProgress)` returns 0 on a
straight and 1 in the middle of a corner. The corner positions were measured off
the racing line in `data/trackPath.ts` by sampling the path and taking the
turning angle per unit of length. Throttle drops in corners, speed follows
throttle, RPM follows throttle, and tyre and brake temperatures rise with
cornering load. That is why the numbers on screen move together instead of
drifting around on their own.

Lap progress comes out of speed rather than a fixed lap time, so a lap time is
the result of the lap rather than a constant.

**Trends and spikes.** Each tyre has its own bias, with the front left highest
because the lap is right hander heavy, and each driver has an aggression factor
on top. So the four corners never read the same and the three drivers differ
from each other. Under braking there is a small chance per tick of a lockup on a
front corner, which spikes that tyre by 14 to 26 degrees along with the brake,
and then recovers on its own through the same drift. Fuel only ever goes down.

**Events.** Most of them come out of the state rather than a list. `events.ts`
holds the thresholds, and every tick the driver is checked against them. An
alarm fires once when it crosses, and cannot fire again until the value drops
back under a lower clear level. Without that hysteresis a tyre sitting at 118
degrees would post an event every tick and bury everything else. Lap completions
and personal bests come from the lap timer. Yellow flags and DRS are random and
belong to the session rather than to a driver, which is why they stay visible
whichever driver you have selected.

Severity is about what the engineer has to do. `info` means it happened,
`caution` means watch it, `critical` means act now.

**Switching drivers.** Every driver has their own history buffers and they are
filled on every tick whether or not that driver is selected. So switching remaps
the charts and the feed to that driver's real history instead of clearing them
and starting again.

## 5. Responsive strategy

Three different layouts, not one layout getting smaller.

**1280 and up.** Three columns. The board is fixed to the height of the
viewport, the header takes its natural height and the rest fills what is left.
Nothing on the page scrolls. Race control is the one card that takes up the
leftover height in its column, and only its list scrolls.

**1024 to 1279.** Two columns. Race status, circuit and weather sit next to the
car and its telemetry, and driver vitals plus race control move to a full width
row below, split into two so the charts do not turn into a tall stack. The page
scrolls normally here.

**Below 1024.** One column, and the order changes. The car comes first because
on a touch screen it is the thing you touch, and race status moves under it. A
strip pinned to the header carries position, lap, driver and fuel margin, so the
two numbers you actually watch stay visible while the rest scrolls past.

Every column has `min-w-0` on it. Without that a long event line or a wide
number pushes its grid track wider than its share and the whole page starts
scrolling sideways, which is what breaks at awkward widths like 1217.

## 6. Challenges and pitfalls

**All three drivers showed the same lap time.** Every lap came out at exactly
84.000 seconds no matter the driver. Speed depends on track position and
position is worked out from speed, so stepping a whole 4.2 second tick at once
locked the lap onto a whole number of ticks. A 1.2 percent difference in pace is
smaller than one tick, so it disappeared. Motion is now integrated in four
smaller steps inside each tick, and the line crossing is interpolated instead of
rounded to the step. Lap times now differ by driver and vary lap to lap.

**Best lap of 41 seconds.** Cars start part way through a lap, so the first time
they crossed the line the timer had only been running for part of a lap, and
that went straight into the best lap. The first crossing now only moves the lap
counter.

**Charts that never updated.** The history buffers are arrays that get pushed
and shifted in place, so the snapshot handed React the same array identity every
tick and nothing re-rendered. The snapshot now copies them. The opposite problem
exists on the driver object, which is also mutated in place, so components read
numbers off it rather than the object itself.

**The corner model did not match the track.** I wrote the corner positions by
hand before there was a map on screen. Once markers were moving along the racing
line it was obvious that five of the nine sat on straights, so the car braked in
the middle of a straight and ran flat out through the stadium section. I sampled
the path, took the curvature, and replaced the guesses with the real corners.

**The race control feed grew the page.** I gave the list `h-full` so it would
fill its panel. A percentage height only resolves against a parent with a real
height, and the grid row was sized by its content, so it resolved to auto and
the list grew forever. Fixing it properly meant fixing the shell instead of the
list. The board is now bound to the viewport height and one card absorbs the
slack.

**The car was too tall.** The art is 800 by 1836. Sizing it by width meant that
at 290 pixels wide it was 666 pixels tall and pushed the telemetry off the
bottom of a laptop screen. It is sized by height now and the aspect ratio works
out the width.

## 7. Trade-offs

The response rates in the simulation are per tick, not per second. It works
because the tick rate is fixed at 700ms, but it means the physics are tied to
the tick. If I added the faster telemetry mode the brief mentions as a bonus,
every value would react differently at the new rate, and the car would behave
like a different car. The fix is to express the rates as time constants and feed
the elapsed time in. It is about twenty minutes of work across a dozen call
sites and I left it out to spend the time on the tyre interaction and the
responsive work instead.

Pit stops are not modelled either. Fuel margin can go negative and stay there,
which is correct as a warning but means it is a live alarm rather than a
strategy tool.

## 8. Performance notes

The simulation runs outside React, and components subscribe to single values
rather than to the whole snapshot, so a tick only re-renders the panels whose
numbers moved. The charts hold a fixed 60 point window and animation is turned
off, because the series is replaced on every tick and animating each replacement
means the line never settles. The y axis domains are fixed too, so the scale
does not jump around under the line.

What I did not do. There is no virtualisation anywhere, because the longest list
on screen is 20 events. I did not memoise components, since the props that reach
them change on every tick anyway and the comparison would just be extra work.

The honest cost is Recharts. It puts the bundle over 500kb and it renders six
chart instances on every tick, three of which are single value bars that would
be cheaper as a div with a width. I would swap those three out with more time.
The car image is another 1.2MB and could be a WebP, but re-encoding an asset
that came with the pack felt like the wrong call for a submission.

## 9. Tools used

- Vite 8, React 19, TypeScript
- Tailwind CSS v4, with the palette and spacing defined as tokens in
  `src/index.css` so no component writes a raw colour
- Recharts for the line charts and the bars
- pnpm
- Prettier

The provided assets are used as they came, except the racing line, which is
inlined as a path string in `src/data/trackPath.ts` so that the marker positions
can be read off a mounted SVG path with `getPointAtLength`.

I used an AI assistant throughout, the way I would use a pair. The simulation
module leaned on it most. Getting believable telemetry out of a lap model is
more maths than frontend, and I wanted my hours going into the interface. I
drove the model, set the rules it had to follow (load comes from where the car
is on the lap, values chase targets instead of jumping, events come from
thresholds rather than a list), reviewed what came back, and checked it against
the screen. Most of the bugs in section 6 are ones I spotted by watching the
dashboard and then traced. The layout, the interaction model and the structure
of the app are my calls, and I can walk through any file here.
