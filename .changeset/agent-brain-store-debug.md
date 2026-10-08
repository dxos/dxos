---
'@dxos/brain': minor
'@dxos/plugin-agent': minor
---

An agent gains a "Brain store" companion: a read-only debug view of its brain as held, showing the raw facts with full attribution, each watch's rules, the facts encoded as the Datalog relations those rules match, and each watch's pending events with when the clock next matters. It reads the brain through the new `TriggerOperation.InspectBrain`, and `@dxos/brain` adds `Encoding.format` and `Encoding.formatEntry` to print encoded facts in the rules dialect.
