---
'@dxos/app-toolkit': patch
# multiple-changesets: the language-learning plugin and this progress/UI work are unrelated subsystems that happen to share a branch; a reader tracing either would not look for it under the other's entry.
---

Progress readouts no longer lie about a run they have lost touch with, and two controls stop escaping
their containers.

- A monitor that goes 90s without an update is failed as `Stopped reporting`, rather than sweeping
  indefinitely. Every terminal a producer can emit travels the same lossy path its progress does — a
  killed process runs no finalizer, an Effect defect escapes the error channel that would report one,
  and a swarm broadcast is fire-and-forget — so a lost terminal used to pin a meter open forever, and
  (for mailbox sync) leave the Sync button disabled with it.
- Entering a phase clears the item count the previous phase reported. A producer signals an
  uncountable phase by sending no total, but `total` is an optional schema field — an explicit
  `undefined` and an absent one are the same bytes on the wire — so the sink kept the old numbers and
  drew a determinate bar over work it could not measure.
- A control's preferred width is expressed as a width rather than a minimum, so a long value (a DID,
  an address) shrinks with its panel instead of overflowing its own field border.
- The emoji picker's panel is portalled, like every other picker, so a scrolling ancestor no longer
  clips it.
- `@dxos/react-ui-components` now depends on `@dxos/progress` directly: the meter reads the runtime's
  own `TaskProgress` rather than a mirrored shape, so a producer and the readout cannot drift.
- `@dxos/progress` gains `phases`/`phase` on `TaskProgress` and `phase`/`total`/`plan` on
  `TaskHandle`, so a run can describe a plan and drop a count it can no longer make.
