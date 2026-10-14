# Memory: growth and size

Two different questions. **Size**: the tab holds too much at idle. **Growth**: it holds more the
longer it runs. Say which one a result answers, and which quantity it read; the four quantities
called "memory" differ by 3 to 5 times (`packages/apps/composer-app/scripts/memory/README.md`).
Private footprint is the only complete one and the one a user sees.

## Did a change move memory?

```bash
pnpm perf compare --base main --metric 'run > peak app footprint'
```

The flow reads footprint per stage, so this is the verdict for both size and a growth that shows
within one flow. Its numbers carry Playwright's own cost; compare them only with each other.

## On a real profile

A user's profile holds private keys and syncs with production. Load one only behind a partition:
`DX_PERF_PROFILE_ARCHIVE=<file> pnpm perf run --scenario memory-profile --offline` (or `--edge` with a
non-production EDGE). Read sizes and constructor names from it, never string contents, and keep its
heap snapshots out of PRs, tasks and chat. `memory-synthetic` is the same soak on generated data, the
control for what being offline costs.

## Size: what does the tab hold?

Measure with nothing attached to the page while it loads. A Playwright page costs this app over
100 MB of its own.

```bash
node packages/apps/composer-app/scripts/memory/ledger.mjs http://localhost:4173 --detached
node packages/apps/composer-app/scripts/memory/ledger.mjs http://localhost:4173 --detached --by-code --dist packages/apps/composer-app/out/composer
```

`ledger.mjs` closes the books per process: allocators, committed wasm and a residual. No
allocator reports wasm linear memory, so the ledger adds it and names the module holding it.

## Growth: what accumulates?

Three snapshots, not two: after warm-up, after N repetitions of one workload and after 2N. What
grows in both intervals is an accumulator; what grows once is a cache filling. The perf flow does
not repeat a workload, so its snapshots show growth from one stage to the next, and
`snapshot-diff.mjs` shows growth while the app sits idle.

```bash
pnpm perf run --snapshots idle,<stage>,end -n 1   # snapshots at one flow's stage boundaries
pnpm perf summarize --heap                        # their composition
node packages/apps/composer-app/scripts/memory/snapshot-diff.mjs http://localhost:4173 --wait1 60 --wait2 420
node packages/apps/composer-app/scripts/memory/retainers.mjs <file.heapsnapshot> --min 400000
```

`snapshot-diff.mjs` snapshots the page and the dedicated worker at two times and lists the
constructors that grew most; `retainers.mjs` names who holds the largest strings in one snapshot.

Snapshots perturb every later stage, so a run that takes them compares with nothing. For growth
over minutes rather than one flow, `soak.mjs` samples footprint over time and `plain-soak.mjs` is
the same with no client attached, the control for growth the instrument itself causes.

## Before claiming a fix

Show the accumulator's retainer chain before and after, then `compare` on the footprint metric.
A footprint that dropped because a stage stopped loading something is not a fix; check the work
counters `compare` lists.
