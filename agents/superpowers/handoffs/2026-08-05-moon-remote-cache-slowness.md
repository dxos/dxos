# moon remote cache: restoration slower than rebuilding, and silent upload failures

Findings from instrumenting the `Check` workflow's e2e jobs while sharding the e2e suite
(DX-1116, PR #12482). Two problems surfaced that are **not** e2e-specific and affect every
CI job that runs moon — handing them off for a focused investigation.

## TL;DR

1. **For 8 of 12 measured tasks, restoring the cached artifact costs more than rebuilding it
   from scratch** — up to 35×. 146 s of pure loss per job on those tasks alone. Restore cost
   tracks artifact bytes/file-count; build cost tracks computation. Tasks that are cheap to
   compute but emit many files (asset copies, typedoc HTML, rolldown bundles) are net losses.
2. **Four tasks never hydrate at all**, re-executing in every job despite producing
   byte-identical hashes. The lookup key is right, so the artifact is absent — an upload-side
   failure. `docs:bundle` is explained (two checked-in mp4s exceed moon's 4 MB per-blob limit).
   `composer-app:bundle` is **not** the same cause — measured, it has no file over 4 MB, but its
   output is **384 MB across 17 954 files**, so total size or file count is the open candidate.
3. Consequence: per-job wall time is dominated by cache hydration, not by real work —
   **920–1121 s of hydration against 20–95 s of execution**, at only 3.0–3.7× effective
   parallelism on 8-core runners.

## Environment

|                            |                                                                                                  |
| :------------------------- | :----------------------------------------------------------------------------------------------- |
| moon                       | 2.4.5 (pinned in `.github/actions/setup/action.yml` + `.prototools`)                             |
| remote cache               | `grpcs://cache.depot.dev`, org header `X-Depot-Org`, token `DEPOT_TOKEN` (`.moon/workspace.yml`) |
| `remote.cache.compression` | **not set** (defaults; zstd not enabled)                                                         |
| runners                    | `depot-ubuntu-24.04-8` (8 vCPU), container `ghcr.io/dxos/gh-actions:24.11.1`                     |
| `MOON_CONCURRENCY`         | 4 in the `test`/`storybook`/`workerd` jobs; **unset** (defaults to core count) in the e2e jobs   |
| repo scale                 | ~300 tasks in the composer-app dep closure                                                       |

## Finding 1 — restoring is often slower than rebuilding

Method: two jobs in the same workflow run resolved the same targets with **identical task
hashes**. In `e2e-bundle` the app-bundle tasks executed cold; in the `e2e (chromium)` shard,
minutes later, the same hashes restored from the remote cache. Joining them by task name gives
a direct build-vs-restore comparison.

| task                        | build cold | restore | verdict                |
| :-------------------------- | ---------: | ------: | :--------------------- |
| `composer-app:prebuild`     |      0.2 s |   7.2 s | **restore 35× slower** |
| `devtools-extension:bundle` |      5.6 s |  51.9 s | restore 9.3× slower    |
| `testbench-app:bundle`      |      6.4 s |  47.3 s | restore 7.4× slower    |
| `client:typedoc`            |      3.2 s |  15.9 s | restore 4.9× slower    |
| `cli:bundle`                |      5.2 s |  24.1 s | restore 4.6× slower    |
| `react-client:typedoc`      |      3.4 s |  13.7 s | restore 4.0× slower    |
| `app-framework:typedoc`     |      3.7 s |  11.6 s | restore 3.1× slower    |
| `todomvc:bundle`            |      1.8 s |   4.2 s | restore 2.3× slower    |
| `shell:bundle`              |      2.0 s |   1.1 s | restore 1.9× faster    |
| `rpc-tunnel-e2e:bundle`     |      0.3 s |   0.1 s | restore 2.7× faster    |
| `examples:bundle`           |      2.5 s |   0.4 s | restore 6.0× faster    |
| `composer-crx:bundle`       |      4.3 s |   0.4 s | restore 11.2× faster   |

**8/12 slower to restore. 146 s wasted per job across those 8.**

Clearest case: `composer-app:prebuild` is literally
`mkdir -p ./public/assets/plugin-tldraw && cp -R node_modules/@dxos/plugin-tldraw/dist/assets/* ...`
— 0.2 s to copy locally, 7.2 s to download the copied result. The typedoc tasks emit thousands
of small HTML files for a few seconds of work. And rolldown is now fast enough that bundling
testbench-app from scratch (6.4 s) beats downloading its ~25 MB output (47.3 s).

Caveats to keep in mind: the two columns come from different runners so network variance is
included, and the build column excludes upload cost. Ratios of 35×/9×/7× are far beyond what
noise explains, but the marginal cases (`todomvc` at 2.3×) are within it. Also "just rebuild"
is only available when a task's own deps are materialized, so this can't be applied blindly.

### Suggested direction

- Audit which tasks have a **high output-bytes-to-compute ratio** and consider
  `options.cache: false` for them (`composer-app:prebuild` is the standout — safe because
  `plugin-tldraw`'s dist is already in the graph via `^:build`).
- Worth checking whether `remote.cache.compression: 'zstd'` improves restore throughput; it is
  currently unset. Note moon's docs warn the cache server must run in the matching storage mode.
- Worth checking whether restore is bandwidth-bound or per-file-syscall-bound. The correlation
  with file count (typedoc, 4834-file composer bundle) over raw bytes hints at per-file
  overhead in unpacking/CAS-fetching rather than throughput.

## Finding 2 — hydration dominates job wall time

Per-job totals, run `31050679009`. "Hydration" = tasks moon reported as `cached from remote`.

| job                | tasks | cached | Σ hydration | Σ executed | wall span | avg parallelism |
| :----------------- | ----: | -----: | ----------: | ---------: | --------: | --------------: |
| `e2e-bundle`       |   305 |    288 |      1001 s |       95 s |     336 s |            3.3× |
| `e2e-knapsack (2)` |   285 |    284 |       920 s |       20 s |     316 s |            3.0× |
| `e2e (chromium)`   |   308 |    303 |      1121 s |       40 s |     318 s |            3.7× |

Two things to note:

- **Executed work is 2–9% of the total.** A "bundle once, share via the cache" precursor job
  therefore saves almost nothing: `e2e-bundle` itself spent 91% of its time hydrating other
  packages' cached `dist`, and every downstream job pays the same ~5 min again.
- **Effective parallelism is only 3.0–3.7× on 8 cores**, because the dep graph serializes
  hydration — a task cannot hydrate until its deps resolve. `MOON_CONCURRENCY` is therefore not
  the lever; graph depth is. Worth investigating whether moon could hydrate cache-hit tasks
  ahead of graph order, since a pure download has no ordering requirement.

Slowest hydrations are library `:build` outputs, consistently: `protocols:build` 25–27 s,
`devtools:build` 24–26 s, `plugin-inbox:build` 24–25 s, `plugin-space:build` 20–23 s,
`plugin-assistant:build` 19 s, `react-ui:build` 15–18 s. Distribution over 284 cached tasks:
29 under 0.5 s, 95 at 0.5–2 s, 98 at 2–5 s, 53 at 5–15 s, 9 over 15 s — a long tail, not one
pathological artifact.

## Finding 3 — four tasks never hydrate (silent upload failure)

`composer-app:bundle` (`8c8a16db`), `storybook-react:bundle` (`5faf2d05`), `docs:bundle`
(`593c969a`) and `tasks:bundle` (`d0204bc3`) re-execute in **every** downstream job.

**Ruled out:**

- _Hash mismatch_ — every hash is byte-identical to the producing job's, so the key is correct
  and the artifact is simply absent. This is upload-side, not env drift.
- _Task configuration_ — `tasks:bundle` and `todomvc:bundle` are structurally identical
  (`deps: [shell:bundle]`, both inheriting `command`/`outputs: [out]` from `.moon/tasks/tag-vite.yml`,
  both emitting to `out/<name>`), yet todomvc hydrates and tasks does not.
- _Artifact size at the 20–25 MB scale_ — `testbench-app` (25 MB, 533 files) and
  `devtools-extension` (20 MB, 542 files) both hydrate fine, so size alone is not disqualifying
  at that magnitude. It is still a live candidate at composer's magnitude — see below.

- _A single blob over 4 MB_ — **measured and ruled out for `composer-app`.** moon aborts an
  action's upload when one blob exceeds 4 MB, which would make every later run a guaranteed miss
  (see moon v1.32 release notes; meant to be handled by the ByteStream API for gRPC servers, and
  Depot does implement Bazel RE v2 + ByteStream with the limit advertised via the Capabilities
  API). It was the leading hypothesis, but a CI diagnostic over the real on-disk output found no
  file above 4 MB in `composer-app/out`. Still worth confirming for `storybook-react`/`tasks`.

**The real anomaly — `composer-app/out` is 384 MB across 17 954 files** (measured in CI, run
`31054215273`; vite's build table had suggested only 122.8 MB / 4834 files, because it omits
files copied from `public/` — chiefly the tldraw assets `prebuild` copies in, plus sourcemaps).
For comparison `todomvc/out` is 26 MB / 62 files and hydrates fine. So the remaining candidates
are **total action size** or **file count**, not per-blob size. This also bounds how fast the
artifact could ever hydrate even if the upload succeeded — 384 MB per runner is not a good deal
against the 21 s it takes to rebuild.

Worth asking whether `composer-app:bundle` should emit sourcemaps at all in the e2e path;
Playwright does not need them, and they are a large fraction of those bytes.

**Direct evidence for a second of the four:** `docs/public/` contains
`blog/images/Table-combobox-feat.mp4` (7 928 964 B) and `blog/images/comments--1-.mp4`
(5 739 521 B). Astro copies `public/` verbatim into `dist`, which is `docs:bundle`'s declared
output — so `docs:bundle` _does_ exceed the 4 MB per-blob limit, unlike composer. Two checked-in
videos are why it never caches. (Separately: 13 MB of video in a cached build output looks like
an accident worth fixing on its own.)

**Not explained:** `storybook-react` and `tasks`.

A diagnostic step lives in the `e2e-bundle` job on PR #12482 (`Report bundle output composition`,
marked temporary — remove when resolved). It prints per-output totals, the largest subdirectories,
the largest individual files and a breakdown by extension, which is how the numbers above were
obtained. Note the caveat that produced a wrong hypothesis first time round: **vite's build table
is not a reliable measure of output size**, because it omits everything copied from `public/`.
Measure the real directory.

Also unexplained and possibly a separate bug: `tasks:bundle` reports completing in 2.0 s, which
seems too fast for a real vite build of a DXOS app, so its task config may not be doing what it
appears to. Its cache miss costs only 2 s, but the discrepancy may be informative.

## Reproducing the measurements

Logs were parsed from GitHub Actions job logs. **These expire after ~7 days** — re-dispatch
`Check` with `e2e: true` to regenerate if needed.

Source data (run `31050679009`, commit `5c73a0bb`):

| job                               | id          |
| :-------------------------------- | :---------- |
| `e2e-bundle` (cold builds)        | 92456873110 |
| `e2e (chromium)` (cache restores) | 92458740113 |
| `e2e-knapsack (2)`                | 92458740131 |

Fetch a job log, then parse. `moon` emits one completion line per task in the form
`▮▮▮▮ <target> (cached from remote, <dur>, <hash>)` for a cache hit and
`▮▮▮▮ <target> (<dur>, <hash>)` for an execution — that distinction is the whole basis of these
numbers. Strip ANSI escapes first (`sed 's/\x1b\[[0-9;]*[mJK]//g'`).

Per-job hydration stats:

```js
// parse.mjs <logfile>
import { readFileSync } from 'node:fs';
const dur = (s) => {
  let ms = 0;
  for (const [, n, u] of s.matchAll(/(\d+)(ms|s|m)(?!s)/g)) ms += +n * (u === 'ms' ? 1 : u === 's' ? 1000 : 60000);
  return ms;
};
const lines = readFileSync(process.argv[2], 'utf8')
  .replace(/\x1b\[[0-9;]*[mJK]/g, '')
  .split('\n');
const done = [];
for (const l of lines) {
  const m = l.match(/^(\S+)\s+▮+ (\S+) \((cached from remote, )?([\dsm ]+),\s*[0-9a-f]{8}\)/);
  if (m && /\d/.test(m[4])) done.push({ ts: new Date(m[1]), target: m[2], cached: !!m[3], ms: dur(m[4]) });
}
const cached = done.filter((d) => d.cached);
const sum = (a) => a.reduce((t, d) => t + d.ms, 0);
const span = (Math.max(...done.map((d) => d.ts)) - Math.min(...done.map((d) => d.ts))) / 1000;
console.log(`${done.length} tasks (${cached.length} cached)`);
console.log(
  `hydration ${(sum(cached) / 1000).toFixed(0)}s, executed ${((sum(done) - sum(cached)) / 1000).toFixed(0)}s`,
);
console.log(`wall ${span.toFixed(0)}s, avg parallelism ${(sum(done) / 1000 / span).toFixed(1)}x`);
for (const d of cached.sort((a, b) => b.ms - a.ms).slice(0, 12))
  console.log(`  ${(d.ms / 1000).toFixed(1)}s ${d.target}`);
```

Build-vs-restore join (needs a cold-build log and a cache-restore log for the same commit):

```js
// compare.mjs — see PR #12482 discussion; joins `ran` from log A against `cached` from log B
// by target name, using the same line format and duration parser as above.
```

## What was already changed in PR #12482 (context, not conclusions)

These were done to speed up e2e and happen to interact with the above:

- `moon run :bundle` was building all 11 apps in every e2e job; scoped to
  `composer-app:bundle todomvc:bundle` (the only two that serve a production bundle to
  Playwright). This removes 7 of the 8 counterproductive-to-restore tasks from the e2e path —
  but they are still paid by other jobs.
- An `e2e-bundle` precursor job was added to bundle once and share via the cache. Finding 2
  shows this helps far less than expected, because hydration — not bundling — is the cost.
- `$DX_E2E_RUN_ID` was added as a task input to force e2e re-execution on dispatch/nightly,
  replacing `MOON_CACHE=off` (which also discarded the dep cache and re-ran ~296 tasks).

## Questions for the investigator

1. Why do the four tasks' artifacts never become readable despite correct hashes — is the 4 MB
   blob abort firing, and if so why isn't ByteStream negotiated with Depot? (Run moon with
   `MOON_LOG=debug`/`trace` in the producing job and grep for remote-cache upload activity.)
2. Is restore throughput bandwidth-bound or per-file-bound? Does
   `remote.cache.compression: 'zstd'` help?
3. Can hydration of cache-hit tasks be parallelized beyond the dep graph's shape, given a
   download has no ordering requirement? Current effective parallelism is 3.0–3.7× on 8 cores.
4. Should moon (or we) skip the cache for tasks whose measured restore time exceeds their build
   time? Is there prior art for a size/benefit heuristic?

## References

- moon remote caching guide — https://moonrepo.dev/docs/guides/remote-cache
- moon v1.32 release notes (4 MB blob abort → ByteStream) — https://moonrepo.dev/blog/moon-v1.32
- Depot Cache for Bazel (RE v2 endpoint) — https://depot.dev/docs/cache/integrations/bazel
- Bazel Remote Execution API v2 — https://buf.build/bazel/remote-apis/docs/main:build.bazel.remote.execution.v2
- DX-1116 — https://linear.app/dxos/issue/DX-1116/speed-up-e2e-test-suite-in-ci-via-sharding
- PR #12482 — https://github.com/dxos/dxos/pull/12482
