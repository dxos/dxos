# Memory harness

Instruments for measuring where a Composer tab's memory goes. Each script drives
headless Chrome over CDP and prints a table; none of them run in CI.

Findings and the composition model they produced live in
[`.agents/projects/memory-usage/`](../../../../../.agents/projects/memory-usage).

## Measuring the right quantity

Four different numbers get called "memory", and they differ by 3–5×. Say which
one a result is:

| Quantity                | Read with                         | Covers                                                       |
| ----------------------- | --------------------------------- | ------------------------------------------------------------ |
| JS heap (used)          | `measure.mjs`                     | live JS objects, per execution context                       |
| Heap snapshot self size | `retainers.mjs`, `snapshot-diff.mjs` | live JS + some native accounting, one context             |
| Attributed allocators   | `memory-dump.mjs`, `parse-trace-stream.mjs` | V8 + malloc + PartitionAlloc + Blink + compositor |
| Private footprint       | `soak.mjs`, `plain-soak.mjs`      | everything committed, including free-but-committed pages     |

Chrome's tab-hover figure is the last one. Code-residency work moves the first;
idle-churn work moves the last.

## Comparing runs

A comparison is only meaningful if these are held constant, so record them
alongside any number:

- **Serving mode.** `vite serve` costs ~2.5× production on the main thread —
  module sources and inline sourcemaps stay resident. Measure `vite preview` or
  a static server over `out/composer`.
- **Plugin set and profile.** A first run performs onboarding and loads a
  different set than a returning one; use `boot-census.mjs --profile <dir>`
  twice against the same directory to measure a returning tab.
- **Settle time.** Modules keep arriving for ~3 minutes after ready.
- **Instrumentation.** An attached CDP client (including DevTools) makes Blink
  retain response bodies, which reads as linear growth. `plain-soak.mjs` is the
  control for that.

## Scripts

| Script                   | Answers                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `measure.mjs`            | Heap per execution context (page, shared and dedicated workers) after a forced GC; optional snapshot capture |
| `soak.mjs`               | Footprint and heap over time; can block request patterns or stub the perf timeline to isolate a suspect |
| `plain-soak.mjs`         | The same, with no CDP client attached to the page — the control for instrumentation-induced growth |
| `memory-dump.mjs`        | Per-allocator ledger from two `memory-infra` dumps, with the delta between them       |
| `parse-trace-stream.mjs` | The same ledger from a trace captured in a real browser (`chrome://tracing`, category `disabled-by-default-memory-infra`); streams, since these run to hundreds of MB |
| `boot-census.mjs`        | What a tab loads and executes: bytes per package via sourcemaps, execution ratio via precise coverage, and the module-activation roster split into boot and idle waves |
| `snapshot-diff.mjs`      | Which constructors grew between two points — the way to find an accumulator          |
| `retainers.mjs`          | Retainer chains for the largest strings in a snapshot — the way to find who holds them |

## Running

These use the repo's pinned Node (24.x) for its global `WebSocket` — the raw
CDP connections need no dependency beyond Playwright. Run them through the
toolchain (`moon`, or a shell with proto's shims on `PATH`); a stray Node 20
fails with `WebSocket is not defined`.

Serve a production build first (numbers from `vite serve` are not comparable):

```bash
moon run composer-app:bundle
pnpm --filter @dxos/composer-app exec vite preview --port 4173
```

Then, from `packages/apps/composer-app`:

```bash
# Heap per context, plus snapshots.
node scripts/memory/measure.mjs http://localhost:4173 --snapshot ./tmp/snaps

# Ten-minute footprint soak.
node scripts/memory/soak.mjs http://localhost:4173 --minutes 10 --interval 30

# What loads at boot, attributed per package.
node scripts/memory/boot-census.mjs http://localhost:4173 out/composer --settle 150

# Where the non-JS memory is, and what grew between two points.
node scripts/memory/memory-dump.mjs http://localhost:4173 --wait1 60 --wait2 480

# Who retains the big strings in a snapshot.
node scripts/memory/retainers.mjs ./tmp/snaps/baseline-page.heapsnapshot --min 400000
```

Snapshots, traces and result files are large and are build output; write them
somewhere ignored, not into the package. `measure.mjs` defaults its result to
`./tmp/memory-last-run.json` under the working directory (`--out` to override).
