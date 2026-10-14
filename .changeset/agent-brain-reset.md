---
'@dxos/ui-editor': minor
'@dxos/plugin-agent': minor
---

An agent's brain on EDGE reads past a hundred facts, can be wiped, and shows its stored facts as highlighted TriG.

- `@dxos/pipeline-rdf`: queries bind graph ids in chunks, so a store in a Cloudflare Durable Object (at most 100 bound parameters per statement) no longer fails with `too many SQL variables` once it holds about fifty facts.
- `@dxos/plugin-agent`: `BrainService.reset` and the `ResetBrain` operation wipe an agent's facts, read cursors and queued events while keeping its watches; the knowledge panel's reset uses them, shows the brain loading or being wiped instead of an empty list, and lays out and highlights the raw TriG of each fact.
- `@dxos/ui-editor`: `highlightTurtle` highlights Turtle or TriG without mounting an editor.
