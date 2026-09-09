---
'@dxos/react-ui': minor
'@dxos/plugin-support': minor
---

Adds `Tour`, a guided walkthrough on Ark's tour machine: `useTour` takes the steps (tooltip steps beside a target, dialog steps centred, with actions, arrow, backdrop and an effect that runs before a step shows) and `Root` provides it; `Backdrop` cuts the target out of the scrim, `Spotlight` frames it, `Positioner`/`Content`/`Arrow`/`Title`/`Description`/`ProgressText`/`Close`/`Control`/`Actions`/`ActionTrigger` make up the card. The machine waits for a target to appear, scrolls it into view, marks it `data-tour-highlighted` (which shows hover-revealed controls), traps focus and walks steps on the arrow keys. The welcome tour in `plugin-support` runs on it; `react-joyride` is gone, and `Tour.Step` is now `{ target, title, description, placement, before }` — `content` is `description`, and the joyride-only fields are no longer accepted.
