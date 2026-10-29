# APEX — F1 Race Intelligence

A buildless, responsive F1 dashboard with race forecasts, historical race results, lap/sector analysis, championship standings, geographic circuit maps, recorded position replay and authenticated live telemetry.

## Run locally

Requires Node.js 20+ for checks/tests and Python 3 for the static server.

```sh
cd apex
npm run dev
```

Open http://localhost:5173. Run `npm test` for model/data checks and `npm run check` for syntax checks. No package installation is needed.

## Data

The included 2024 and 2026 snapshots come from the public Jolpica API. Their `fetchedAt` fields identify snapshot age. All result pages were merged by race round. “Refresh data” fetches the selected season from Jolpica without changing disk snapshots. Provider availability, coverage and corrections affect results. Standings show the latest available season standings, independently of the selected race.

OpenF1 lap/sector data loads on demand for completed races. Average pace removes pit-out laps and laps outside 85–110% of the driver’s median, with no tyre/fuel/safety-car correction. Individual sector minima may belong to different laps. Missing telemetry is shown as a dash, never fabricated. Free endpoints may be rate limited or unavailable during live events.

Replay follows recorded position-change timestamps at 60× speed. It does not fabricate track markers. Live mode polls the active OpenF1 session every 10 seconds for running order and actual x/y location samples. A paid OpenF1 subscription/access token is required. Enter the token in settings; it is held only in tab memory and sent only to `api.openf1.org`. Reconnect when it expires. The app marks failed feeds stale and stops polling. No live feed is claimed until an active session is found.

Geographic track outlines are sourced from https://github.com/bacinger/f1-circuits (MIT). Circuit colors follow the host country palette and do not represent official timing sectors. Geometry can differ from the latest configuration. Live coordinates render independently in their native telemetry coordinate plane with recent movement trails.

## Forecast methodology

The experimental Monte Carlo baseline scores drivers using 72% blended recent/season finishing position, 18% recent grid, and 10% constructor form. The form slider blends the last five finishes with season averages. Each run adds Gaussian variation and a retirement penalty (2.5% baseline risk, adjusted by recent DNFs). Drivers are drawn from the last completed race before the selected event. The selected and subsequent rounds are excluded to prevent future-result leakage.

Win/podium frequencies are uncalibrated model estimates, not validated probabilities. There is no trained ML model, weather/tyre/track adjustment, current qualifying integration, or backtested accuracy claim. Historical selection produces a historical pre-race forecast. Initial rounds without prior results show an insufficient-data state.

## Race room and strategy lab

The red-and-white homepage opens on the most recent completed race in the selected season. A lightweight background check looks for newer results; the cached snapshot remains available offline. Selecting another race changes its results, circuit palette and recorded pit-stop choices. National colors are decorative and never represent official timing sectors.

Three.js 0.180.0 and OrbitControls are vendored in `dist/vendor/` with their MIT license. Circuit outlines become real 3D ribbon meshes, with orbit, isometric/top views, keyboard rotation and explicit zoom controls. The road has illustrative mesh depth, without a measured elevation profile. If WebGL is unavailable, the geographic SVG outline is used instead.

The what-if tool uses cached recorded Jolpica pit stops. Choose a lead-lap finisher and a stop, then move it within the preceding/following stops. The model compares linear tyre-age costs at the recorded and altered stop laps. Editable assumptions are old/new tyre degradation, fresh-tyre pace advantage, and extra pit time. The resulting time delta is applied to the driver's official finish time; comparable lead-lap finishers are reordered. Retirements and lapped cars retain their classifications. Recorded lane duration is informational and is not used as a pit-loss estimate. An unchanged stop with unchanged assumptions reproduces the original order exactly.

This is a conditional sensitivity model. It does not model overtaking, traffic, weather, safety cars, incidents, or opponent strategy changes. Tyre assumptions are not fitted telemetry measurements, and projected positions are not calibrated predictions. The recorded results are never overwritten.

Static hosting configuration lives in `.openai/hosting.json`. All assets needed to run the application are in `dist/`; web fonts are optional external resources.
