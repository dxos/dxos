# Alien Labs metrics

Cairn's operating numbers, one sheet per kind of chart the sheet plugin draws, so the space shows each
of them on data that means something. The numbers agree with the other partials: Okapi bypassed the
cache during its incident five weeks back, Lumen signed three weeks ago, Meridian is still on trial,
and the four agents do much of the work.

- Code: this directory: `partial.ts`, `sheets.ts`, `index.ts`, `partial.test.ts`
- Requires: nothing
- Provides: `sheets.<key>`
- Clock: unused. `hitRate` counts days back from the reference date (−59 to 0), so Okapi's dip at −35
  and −34 lines up with the incident timeline in [docs](../docs/CONTENT.md).
- Used by: Alien Labs (`../FieldstoneSpace.ts`)

## Contents

### Sheets

- 6 `Sheet`. Each has a styled header row and one entry in `charts`, named after the sheet, whose
  range is the whole table with `header: true`. Numbers are seeded, so every build is identical.
  - `hitRate` "Cache hit rate, last 60 days", chart `xy`: a `Day` column (−59 to 0) and one hit-rate
    % column per customer: Northpine, Meridian, Okapi, Lumen. 60 rows.
    - Northpine holds near 88%. Meridian climbs from about 45% to 70% over its trial.
    - Okapi holds near 92%, is 0 at −35 and −34 (cache bypassed), and is back above 85% by −30.
    - Lumen is empty before −21, the day it signed, and settles near 80%.
  - `agentRuns` "Agent runs", chart `scatter`: `Tokens (k)` then one wall-time-in-minutes column per
    agent: Builder, Reviewer, Triage, Scribe. 200 rows, 50 per agent. Each row fills only its agent's
    column. Each agent has its own shape, so the clouds cover the chart:
    - Builder: 150k to 700k tokens, the steepest diagonal, up to about 50 minutes.
    - Reviewer: 80k to 450k tokens, a shallower diagonal.
    - Triage: under 120k tokens but 5 to 30 minutes waiting on CI, a band up the left.
    - Scribe: 100k to 650k tokens of transcript read in under 10 minutes, a band along the bottom.
  - `buildTimes` "Build time vs. cache hit rate", chart `scatter` with `regression: true`:
    `Cache hit rate (%)` then one build-minutes column per customer: Okapi, Northpine, Meridian. 120
    rows, 40 per customer, each row filling one column. Each customer is a cloud of builds around its
    typical hit rate (Meridian 45%, Northpine 62%, Okapi 80%), and the clouds overlap. Within each
    customer, builds get shorter as the hit rate rises. Across all three, the larger repos have both
    the highest hit rates and the longest builds, so the overall line slopes up (Simpson's paradox).
  - `requestHeatmap` "Cache requests by weekday and hour (UTC)", chart `heatmap`: a `Day` column (Mon
    to Sun) and 24 hour columns (`00` to `23`) of thousands of requests over the last 4 weeks. 7 rows.
    - Weekdays peak 08–16 (Europe) and 14–22 (North America), with a nightly CI spike at 02.
    - Weekends run at about a fifth of the weekday daytime load; the 02 spike stays.
  - `customerHealth` "Customer health", chart `radar`: a `Measure` column (Usage, Hit rate, Adoption,
    Satisfaction, Expansion, Engagement) and one 0–10 score column per customer: Northpine, Meridian,
    Okapi, Lumen. 6 rows.
    - Northpine scores high everywhere. Meridian is low on usage and adoption.
    - Okapi is low on satisfaction and expansion. Lumen is high on satisfaction and engagement.
  - `requestsByCountry` "Cache requests by country, last 30 days", chart `map`: `Country` and
    `Requests (M)`. 30 rows, every country named as in the Natural Earth 110m atlas. The United States
    leads, then Germany and the United Kingdom; Canada and Portugal, where the team works, are in it.

### Collections

- `Metrics`: the 6 sheets, in the order above.

## Flows

1. Open the Metrics collection, open "Cache hit rate, last 60 days", open the Charts companion: four
   lines, Okapi's drops to zero five weeks back, Lumen's starts three weeks back.
2. Open each other sheet's Charts companion and see its chart: scatter, scatter with regression lines,
   heatmap, radar and world map.
3. In "Build time vs. cache hit rate", hover a dot and read its tip.

## Checks

- 6 sheets in the `Metrics` collection, each with exactly 1 chart.
- The chart types are `xy`, `scatter`, `scatter` with `regression`, `heatmap`, `radar` and `map`.
- Each chart's range covers every filled cell of its sheet.
- `hitRate`: 60 rows; Okapi is 0 at −35 and −34; Lumen is empty before −21.
- `agentRuns`: 200 rows, 50 per agent, each filling exactly one agent column.
- `buildTimes`: 120 rows, 40 per customer, each filling exactly one column. The least-squares slope is
  negative within each customer and positive across all 120.
- `requestHeatmap`: 7 rows × 24 hour columns, all filled.
- `customerHealth`: 6 measures × 4 customers, every score from 0 to 10.
- `requestsByCountry`: 30 rows, every name a country in the Natural Earth 110m atlas.
