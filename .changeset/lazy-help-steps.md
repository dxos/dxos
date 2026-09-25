---
'@dxos/plugin-support': minor
---

Load the welcome tour's steps on demand. BREAKING: `SupportPlugin`'s `helpSteps` option takes a `() => Promise<Tour.Step[]>` loader instead of a `Tour.Step[]` array, keeping the step definitions and the operations they invoke out of the host's eager startup bundle.
