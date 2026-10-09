# Boot: what loads before ready

Boot cost has a structural half (what the bundle makes the browser fetch and evaluate before
ready) and a runtime half (what the app does once it has it). Fix the structural half first; it
is deterministic and CI already gates it.

## The structural budget

```bash
pnpm perf gate                                    # the check-boot-budget CI runs on every PR
node packages/apps/composer-app/scripts/compare-boot-budget.mjs --base <a.json> --head <b.json>
```

The gate counts the bytes and chunks of the entry script's modulepreload closure
(`packages/apps/composer-app/out/boot-budget.json`). `compare-boot-budget.mjs` diffs two such
reports per chunk, so a change shows which chunks it added or grew.

## Why is a module in the boot graph?

```bash
DX_TRACE_BOOT_LEAK=1 moon run composer-app:bundle
```

The build prints the shortest static import chain from `main.tsx` to each package that must never
be boot-reachable (the targets in `composer-app/src/vite/trace-boot-leak.ts`). For a package not on
that list, `pnpm dx-trace-imports --from packages/apps/composer-app/src/main.tsx --to <package>`
prints its chains. The fix is usually at the first link that did not need to be static. Prefer build configuration (the chunking groups in
`vite.config.ts`, an exclude list, an import map) over rewriting runtime code to avoid a
dependency.

## Runtime: what happens before ready

```bash
pnpm perf compare --base main --metric 'wall > boot' --http2 --until boot
DX_PWA=false moon run composer-app:e2e-startup
node packages/apps/composer-app/scripts/memory/boot-census.mjs http://localhost:4173 out/composer --settle 150
```

The perf flow cannot profile `boot`, since nothing exists to attach to before the page does, so
`summarize` has no boot rows. The startup harness owns boot attribution: its reports name the
slowest module activations, and each run appends a row to `.perf/startup-benchmarks.md`.
`boot-census.mjs` attributes what loaded at boot to packages. The local preview serves HTTP/1.1,
where hundreds of lazy chunks queue behind six connections; production is HTTP/2. Treat a boot
timing dominated by request queueing as a serving artifact until it shows under `--http2` too.
`--until boot` skips the stages after boot, though the projects fixture still gets built.
