# Spike — is the activation scheduler itself a startup cost?

**Answer: no.** Scheduler overhead is a flat **~0.29 ms per module**. On today's wave split the whole
activation scheduler accounts for **~30 ms** of the boot critical path; removing every index- and
value-shaped family takes that to **~15 ms**. Against a ~16 s cold boot that is 0.1% — below the
noise floor of every other measurement in this project.

Tests the hypothesis that compiling index-shaped and value-shaped contributions into a static
manifest would speed startup by taking work off the scheduler, _independently_ of any reduction in
code loaded.

## Method

`bench-manager.mjs` runs the real `PluginManager` over a synthetic population replicated from
[`map.json`](../map.json) — same module count, per-plugin grouping, family sizes (so multi-capability
fan-in is real) and every recorded `requires` edge. **Module bodies are empty**, so wall time is
scheduler work only: registration, round selection, graph construction, Kahn waves, contribution
expansion, capability-registry writes.

The `manifest` variants drop the index- and value-shaped families (`translations`, `pluginAsset`,
`schema`, `reactSurface`, `appGraphBuilder`, `createObject`, `skillDefinition`, `operationHandler`)
and nothing else. Every required singleton gets a dedicated provider module so the graph stays
satisfiable in both variants — 29 such modules, added to every variant equally, hence cancelling out
of the deltas.

```bash
node bench-manager.mjs families   # full vs manifest vs manifest+settings
node bench-manager.mjs waves      # today's Startup/Idle split
node bench-manager.mjs sweep      # per-module cost vs population size

BODY=micro   node bench-manager.mjs families   # bodies suspend on a resolved promise
BODY=delay DELAY_MS=10 node bench-manager.mjs families
SUBSCRIBE=1  node bench-manager.mjs families   # live index rebuild per contribution
```

Requires `moon run app-framework:build` first — the harness imports the built `dist/lib` entries.

## Results

Median of 5–7 runs, node 22, 4-vCPU container, milliseconds.

| population                       | modules | boot pass | `start()` | idle wave | total |
| -------------------------------- | ------: | --------: | --------: | --------: | ----: |
| full, all on the boot pass       |     485 |       485 |     111.3 |       0.5 | 118.8 |
| manifest: index + value families |     190 |       190 |      30.0 |       0.2 |  32.4 |
| manifest + settings              |     169 |       169 |      22.3 |       0.1 |  23.9 |
| **full, today's wave split**     |     485 |       127 |      29.6 |     101.1 | 134.8 |
| **manifest, today's wave split** |     190 |        90 |      15.3 |      18.5 |  35.8 |

"Today's wave split" pins only the families whose makers set `activatesOn: Startup` in
`AppCapability.ts`; everything else rides the idle wave. The Idle-default flip has already moved most
of this work off the critical path.

Identical within noise across all three body models (`none` / `micro` / `SUBSCRIBE=1`): 0.28–0.29
ms/module in every case. A live subscriber rebuilding a bucket index on every contribution — the
`SurfaceManager.indexByRole` shape — adds nothing measurable.

## What population _is_ coupled to

`ActivationScheduler.WAVE_CONCURRENCY = 16` bounds each wave's fan-out, so wall clock ≈
(modules ÷ 16) × body cost. With `BODY=delay DELAY_MS=10`: full 464 ms vs manifest 187 ms, a 278 ms
delta. That decomposes as 295 ÷ 16 × 10 ms = 184 ms of serialized body cost **plus** the ~83 ms of
scheduler overhead — additive and linear, with **no superlinear barrier penalty**. Every module taken
off the boot pass removes about a sixteenth of its body cost from the critical path; that is a
code-loading win, not a scheduling one.

## No hotspot to optimize either

`node --cpu-prof` over the full run: the scheduler's own module (`chunk-plugin-manager.mjs`) is 84 ms
self-time across nine runs, spread across per-module activation machinery — `#runActivation`,
`#activateModule`, `#awaitProvidersInFlight` — with the Effect runtime (`makePrimitive`, `runLoop`,
`getCont`) above it. The graph algorithms (Kahn waves, runnable selection, cycle detection) never
surface. The cost is per-module fiber allocation, which is why it is flat per module and why there is
no cheap multiple available inside the scheduler.

Mild superlinearity exists but far above current scale: 0.153 ms/module at 970 modules, 0.291 ms at
2,910 (`sweep`). At 485 the population is not on that curve.

## Caveats

- Node, not the browser. Pure-JS work is typically within a small factor across the two and the
  conclusion has more than an order of magnitude of headroom, but a Chromium run would settle it.
- Bodies are empty by construction — that is the experiment, and it is why these numbers must not be
  read as boot times.
- The population replays the 2026-07-31 map; family sizes have drifted since (per-operation lazy
  handler sets landed after it).

## Implication

The case for a build-time manifest rests on the 58 plugin-definition chunk imports and on keeping
module bodies off the boot pass — both code-loading arguments. It does not rest on scheduler relief.
