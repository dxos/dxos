# CI — design notes

The build/test pipeline itself: runners, caching, and the workflows in `.depot/workflows`
(Depot CI) and `.github/workflows`.
Measurements live in [`REPORT.md`](./REPORT.md), open work in [`TASKS.md`](./TASKS.md), and the
cache's operational runbook in [`tools/moon-cache/`](../../../tools/moon-cache/README.md).

## Shape of the pipeline

One workflow, **Check** (`.depot/workflows/check.yml`, on Depot CI) — build, test, lint, fmt. Seven
job types on `depot-ubuntu-24.04-8`, all inside `ghcr.io/dxos/gh-actions`, with e2e sharded further.
Roughly 300 tasks in the composer-app dependency closure, so ~10 concurrent cache clients per run.

Everything routes through `moon`, and `.moon/workspace.yml` decides where the remote cache lives.

### What runs is decided once per job, not per step

`.depot/actions/affected` resolves the trigger to `MOON_AFFECTED`/`MOON_BASE` (or to nothing, for a
full run) immediately after setup, and every `moon` step is then unconditional — no `--affected`
flag, no `if:`. The previous shape carried an Affected and an All variant of each step gated on
`branch != 'main'`, which is a proxy that gets several triggers wrong and which doubled again in
`test` for the presence of `TRUNK_TOKEN` (four steps for one command). Three things follow:

- **The base comes from the event, not from `vcs.defaultBranch`.** `moon`'s own `remote` scope is
  right only for a topic-branch PR; `pull_request.base.sha` and `merge_group.base_sha` are exact.
- **A missing event resolves too.** With no `GITHUB_*` in the environment the resolver falls back to
  the merge-base with `origin/main`, so running it by hand in a checkout scopes the way the real
  trigger would rather than rebuilding the world. The resolver's `--event <name>` emulates any
  trigger; the full table is in `.depot/actions/affected/README.md`.
- **An unresolvable base means a full run, never an empty one.** `moon` exits 0 having run nothing
  when the affected set comes back empty, so a base that silently fails to resolve turns every gate
  green — the failure mode below, in a second guise.

### The `check` job runs in three stages, ordered by dependency

Stage boundaries are the dependency edges. Within a stage, independent steps run concurrently
(Depot CI `parallel:` blocks), so a stage costs its slowest member rather than the sum:

1. **No-build gates** — nine independent node scripts at 1–6 s each, one `parallel:` block with
   `fail-fast: false`. They used to be a cheap-first sequence, which bought time-to-red-signal at
   the price of reporting one failure per run; concurrent + report-all gets both, and a PR with an
   unformatted file _and_ a bad publish config learns both in one cycle. The peer-dependency check
   is **excluded** and stays sequential: `--no-frozen-lockfile` can rewrite `pnpm-lock.yaml`, an
   input to every moon task, and the `trap` that restores it does not survive a hard cancellation —
   a cancelled sibling would leave stages 2 and 3 missing the cache.
2. **The compile gate** — `moon run :lint :build :test-types`, ~15 s warm and the job's floor cold.
   `check-module-structure` belongs here and not in stage 1 despite costing 5 s: it declares
   `deps: [build]`, so ahead of the gate it would pull the builds along with it.
3. **The slow checks** — `knip` (2m36s–3m21s, and the bulk of the job's real work) in one lane
   against `check-plugin-set` + `docs:bundle` in the other, `fail-fast: false`. The stage now costs
   knip rather than all three, and the block's own failure semantics replace the
   `continue-on-error`-plus-gate-step pair that existed to keep it report-all. The two moon checks
   share **one** invocation rather than a lane each: they overlap in `^:build`, and moon schedules
   that graph once instead of two processes contending for the same task locks and cache writes.

   That invocation is wrapped in `env -u MOON_AFFECTED -u MOON_BASE -u MOON_HEAD`, and it is the one
   place in the workflow that opts out of the job-level scope. Both checks catch a property of an
   IMPORT EDGE, where the offending edit lands in a package neither project's inputs name — the same
   reason `check-boot-budget` runs unscoped on its own job — so scoping them to composer-app's and
   docs' own sources would skip them on exactly the PRs they exist to catch. **Unset, not
   `MOON_AFFECTED=''`:** empty is not "off" — moon reads it as an empty base and still filters, which
   is how this regressed once already (it was caught in review of the same change that introduced it,
   after a run where the step silently reported "No tasks affected").
   `check-boot-budget` was among these until it moved to its own `boot-budget` job;
   `check-plugin-set` stayed because its `DX_PLUGIN_SET=production` bundle is cheap only on a runner
   where stage 2 has already warmed `^:build` (22 s there, against the boot budget's 41 s when the
   two shared this job).

**Two things a `parallel:` block must not contain**, and both are why the blocks stop where they do:
a step that mutates a moon task input, and a second concurrent `moon` process in the same workspace.
Filesystem state is shared across a block — only step outputs, env and `$GITHUB_PATH` are snapshotted
per unit and merged back on join.

Two facts the ordering depends on, both verified rather than assumed:

- **`pnpm-lock.yaml` is an input to every moon task** (`.moon/tasks/all.yml`). Editing it and
  re-running a cached task changes the hash, so the peer-dependency step — which passes
  `--no-frozen-lockfile` and may rewrite the lockfile — restores it under a `trap` instead of
  invalidating stages 2 and 3. That is why the step could not simply be moved to the front.
- **The production `bundle` is not otherwise built anywhere in Check.** `:build` does not include it
  and `e2e-bundle` builds `bundle-e2e`, a separate cache entry by design (`DX_PWA=false` changes the
  very boot graph the budget measures). So `check-boot-budget` pays for that bundle wherever it
  lives, which is why it now owns the `boot-budget` job: on `check` it sat behind all of stage 1+2
  for library builds the remote cache already holds, and it was measured there at 53 s for the step,
  28 s of it the bundle building from source with its 281 dependency tasks hydrated. Its earlier home
  — one `e2e` cell — could never gate a PR automatically: `e2e` runs on main/changeset-release, or on
  an explicit dispatch someone has to ask for.

Neither caching the small scripts as moon tasks nor caching `knip` was worth it: the scripts run in
1–6 s, and knip is a whole-repo analysis that any real PR invalidates, so its hit rate is ~0.

## The failure mode that governs every decision here

**moon treats every remote-cache failure as non-fatal.** A missing credential, a rejected
credential, an unresolvable host and a dropped blob batch all produce the same outcome: a warning,
a green run, and a full rebuild. Four separate instances of this have now been observed
(see REPORT.md, “Silent-degradation modes”).

Two consequences that any change in this area has to respect:

1. **Nothing here can be verified by "CI is green."** Correctness and cache health are independent
   signals, and only one of them turns the build red.
2. **Assert the cache works, not that it was used.** The setup action probes reachability and
   certificate acceptance before any task runs. Counting cache hits cannot do this job — a
   legitimately cold branch has zero hits too.

A live example: `preview.yml`, `upload-introspect-cache.yml` and `publish-all.yml` call the setup
action and run moon tasks but never set `DEPOT_TOKEN`, so they have had **no remote cache at all**
for an unknown length of time, with no signal.

`scripts/check-cache-wiring.mjs`, the guard added against exactly that, then fell to the same class
itself: it matched `./.github/actions/setup` under `.github/workflows`, and the Depot CI migration
moved every call site to `./.depot/actions/setup` under `.depot/workflows`. It passed by matching
nothing. It now scans both directories, accepts both spellings, flattens `parallel:`/`sequential:`
groups, and **fails when it finds zero call sites** — a checker that matches nothing reports the same
green as a correctly wired repo.

## Cache: where it stands

Depot's hosted cache hydrates a 324-task `:build` in ~1,100 s; a self-hosted `bazel-remote` does it
in ~86 s from the same machine at the same RTT. The cost is not bandwidth and not network latency —
it is invariant to where the client sits, which is why it does not improve on a Depot runner
either. Full analysis in [`REPORT.md`](./REPORT.md).

Settled: a self-hosted `bazel-remote` on a DigitalOcean droplet in NYC3, behind mTLS, on Depot
runners. Blacksmith was evaluated as an alternative runner and rejected — REPORT.md, "Runners".

## E2E: how the suite is sharded

Two axes into 6 matrix cells — browser (`PLAYWRIGHT_BROWSER`) × shard (`composer` / `rest`). The
`composer` cell runs `composer-app:e2e` directly (3 Playwright workers — 4 was refuted in one run:
two-peer specs boot two app instances per worker, and at 4 webkit lost renderers and firefox missed
create-space's 10 s readiness budget, run 31506532354, against 0-in-39 at 2 workers; 4 also bought
no time, 3m09 vs the halves' serial 3m15, because two-peer waits dominate, not queue depth); the
`rest` cell runs an explicit target list **computed by moon** —
`moon query tasks "task=e2e && project!=composer-app"` mapped to `<project>:e2e` — one task at a time
(`--concurrency=1`), each at the preset's workers. Nothing is hand-maintained: a new `e2e` suite joins
the pool automatically, including projects like `plugin-script` that define `e2e` without the tag. The
step fails when the list comes back empty, because a broken query would otherwise run nothing and
report the cell green.

**Why computed rather than a glob or an `exec --query`:** `:e2e` also matches composer-app, and MQL
negation is honoured by `moon query` but NOT by `moon exec --query` — a bare `project!=x` filters
nothing there, and it is still ignored beside a positive clause, so `moon exec ':e2e' --query
project!=composer-app` ran composer's 36 tests in the pool cell on top of the 8 suites (78 tests in
one cell). MQL parentheses are also a parse error. An earlier `e2e-ci` marker task (a clone of `e2e`
that composer excluded) solved the same problem with a duplicate task and its own cache entries. Job
layout and the JUnit paths Trunk reads are in [`.depot/README.md`](../../../.depot/README.md).

The browser rides an env var rather than per-browser task variants (`e2e-chromium`, …) so it does not
multiply with the shard dimension in the task namespace. Being a hash input already gives each
browser its own cache entry.

The previous shape — `moon exec --job N --job-total 3` with composer split into `e2e-ci-1of2`/`-2of2`
halves — was retired by measurement: moon's partitioner assigned both halves to the same cell in
every observed run, and `--concurrency=1` then ran them back-to-back (2m30 + 45s, serially, one
machine), so the split delivered no parallelism of any kind while costing two cache entries, two
webServer lifecycles and a port-collision workaround (`reuseExistingServer`). Splitting one suite's
tests across _cells_ remains unsolved (Playwright `--shard` can cut the suite, but moon owns cell
assignment and cannot be told to separate two targets); today composer splits by browser only —
finer granularity is a possible follow-up.

### Sharding alternatives measured and rejected

Two other strategies were built out and run head-to-head against the shipped one in a single 27-cell
run (9 cells each, same commit). Neither survives in the diff; recorded so the choice is not
re-litigated from scratch.

|                                               |   critical path | runner-time | targets |            failures |
| :-------------------------------------------- | --------------: | ----------: | ------: | ------------------: |
| Knapsack Pro queue mode + per-browser split   |            297s |       1618s |   27/27 | 5 (only 2 surfaced) |
| Per-browser moon task variants, 9 cells       | ~335s corrected |      ~1470s |   23/25 |                   2 |
| **Browser × `--job`, 9 cells (then shipped)** |            364s |       1500s |   27/27 |                   6 |

All three landed within ~10% on runner cost and 297–364s on critical path, so speed did not decide it:

1. **Knapsack Pro** (`@knapsack-pro/playwright`, a file-level queue ordered by recorded duration) needs
   an external service and a token, and its measured advantage came entirely from offloading composer —
   the part `--shard` now handles in-repo. Two of its cells also reported success while a test failed,
   masked by quarantine.
2. **Per-browser moon task variants** put all 24 browser targets in one flat pool, which can lend work
   across browsers — a real advantage, since chromium's pool is ~30% heavier. But the browser then
   multiplies with the shard dimension, and splitting composer fixes the same imbalance more directly.
   Its numbers are corrected because moon's default bail silently dropped `composer-app:e2e-chromium`
   and `plugin-sheet:e2e-chromium` from a failing cell, making the arm look cheapest when it had simply
   skipped the two most expensive targets — which is what motivated `--on-failure continue`.

**Retries are absent by policy** (`e2ePreset` sets `retries: 0`; two retry loops were also removed
from composer's `app-manager.ts`). A retry converts a product defect into a slow pass — removing the
create-space retries is what exposed the real rejection they had been masking. An unstable test gets
`test.fixme` with evidence, never a retry. **One deliberate, temporary exception:** the three
two-peer describes — composer's halo and collaboration, and todomvc's `Basic test` (whose
`beforeEach` runs an invitation) — carry `retries: 2` scoped to cause A. The defect is known, tracked
(DX-1152) and endemic in production, so a first-attempt failure carries no new information while it
holds every run red; Trunk still records each first attempt. All three carry a STRICTLY-temporary
TODO and come out when DX-1152 lands. Nothing else in the repo may retry.

Runtime, cold cache: e2e's slowest shard is 7.7 min (6.2 warm) against `test` at 12.8 min and
`storybook` at 9.4 min, measured when unit/browser, storybook and workerd were three flavour-shaped
jobs. **E2E is no longer the critical path — `test` is.**

### `test` shards by work, not by flavour

The three former jobs (`test`, `storybook`, `workerd`) each fixed a cell's size to its flavour's own
total, so the critical path was whatever storybook happened to weigh and more runners could not move
it. They are now one matrix of four cells, each `moon exec --job N --job-total 4 :test :test-browser
:test-storybook :test-workerd`: moon partitions the whole target set, so cells are sized by work and a
new suite lands wherever there is room. Consequences worth knowing:

- Playwright is installed on every cell — moon owns cell assignment, so a cell's flavours are not
  known to the workflow.
- One `VITEST_COVERAGE` for all four is safe because `vite.base.config.ts` drops coverage for the
  `workerd` project type; that used to be a per-job `VITEST_COVERAGE: 'false'`.
- `--on-failure continue`, as on the e2e cells: moon's default bail would drop a failing cell's
  remaining targets and hide what they cost.
- Artifacts are per cell (`vitest-report-<node>-<shard>`), and `needs.test.result` in `report`
  aggregates the matrix.

`--job` is also what the retired e2e sharding used; there it failed for a different reason (the
partitioner co-located composer's two halves — see below). Here there is no such pair, and no target
list is hand-maintained.

### Running a campaign, and attributing a red cell

One dispatch of `Check` with `e2e: true` produces the 6 cells (9 before the composer/rest matrix); `workflow_dispatch` keys its
concurrency group on `github.run_id`, so dispatches do not cancel each other and ten can run at once.

**Count a run only if** the dispatch response echoed `inputs:{"e2e":"true"}` **and** the run contains
6 `e2e (browser, shard)` jobs — a wrong parameter name (`workflow_inputs`) yields a run that looks
normal and silently skips e2e.

**Attribute a failure by grepping the job log for `✘`,** never from the Trunk summary: a cell can exit
1 while Trunk reports 100% pass, whenever a moon task fails without emitting an XML row. Reconcile
`Tasks: N completed, 1 failed` against the `▮▮▮▮ <task>` banners in the log body.

## E2E flakes: the four causes

Ten runs on `e0d4e12e` (2 green / 8 red) plus a 3-run sample on `0414d01a` (0 green / 4 red cells)
reduced every red cell to four causes.

**A — the production-edge two-peer path. Dominant** (5 of 8 red cells, then 3 of 4), and the one that
is not ours. Space invitations, device invitations, space replication and todo replication all stall,
across all three browsers and both apps. Edge-side (SigNoz, `service.name = 'edge'`, note the
**lowercase** `severity_text = 'error'`): `RouterObject` resetting on Durable Object storage timeouts
(`Durable Object storage operation exceeded timeout…` at `RouterObject.webSocketMessage`,
`cannot access storage because object has moved to a different machine` — once inside `_joinSwarm`)
plus `SubductionAutomergeReplicator`'s 60 s `process pass hung` watchdog. Bursts land inside the
failing tests' wait windows to the second, and the class is endemic rather than test-induced:
4–115 errors/hour at rest, spiking to 375–478/hour with no e2e load. Client-side,
`EdgeSignalManager.join()` sends one unacknowledged JOIN and `_rejoinAllSwarms()` fires only on socket
reconnect, so a message dropped **on a socket that stays open** strands the peer with no recovery
path. Tracked as **DX-1152** (edge side); `dxos/edge#840` should heal the replication half by closing
the socket instead of dropping a frame. Consequence for planning: with ~30 two-peer operations per run
and a ~2 % stall tail, **no ten-run campaign can be green until this is fixed** — and VM sizing
measured against it would be meaningless.

The "composer-specific, not the edge" hypothesis was tested and refuted by a controlled local
comparison (same box, same production edge, chromium, 1 worker, first-attempt counts, 16 two-peer
sequences per arm): composer collaboration failed 1/16, todomvc basic failed 2/16 — statistically
indistinguishable, and the dominant signature is byte-identical in both apps (the shell's auth-code
input disabled at `connectingSpaceInvitation`). Composer is ~3× heavier per sequence (15.7 vs 5.4
min for the same count) but no more failure-prone; the stall lives in the shared invitation path.

**B — the comment marker landed on the wrong thread** (~25 % of firefox samples, fixed). The editor
keyed comments by **URI**, and a thread's URI gains its space when its first message persists it
(`echo:///<id>` → `echo://<spaceId>/<id>`). Clicking a thread while a sibling persisted made
`scrollCommentIntoView`'s lookup miss and silently no-op, after which the debounced proximity tracker
wrote the previous thread back over the click — terminal, no self-heal. Fixed by keying on the stable
object id at the comment-sync boundary, which also revived `onDelete`'s committed-thread branch (it had
been comparing a URI against an object id, so it was dead code). `CommentState.current`'s writers
disagree on spelling, so readers compare via `currentObjectId` (an EID-parsing helper in plugin-review
`util/comment-state.ts`), never by string equality.

**C — text typed into an unbound editor was destroyed** (fixed). While a `Markdown.Document`'s
`content` ref is unresolved, `useExtensions` omitted the automerge extension, so the editor mounted
**editable but unbound**; when the ref resolved, the binding's attach-reconcile replaced the whole
document with the loaded value. Neither binding gated it — the default binding hardcodes
`loading: false`, and the review binding's `loading` covers only branch/checkpoint/fork. This was a
**user-facing data-loss window**: a reader who opens a slow-loading document and types immediately
loses those keystrokes. Fixed in `useExtensions` — while `contentRef && !target` the editor
contributes `EditorState.readOnly` **and** `EditorView.editable.of(false)`. Not `readOnly` alone: that
is advisory, whereas a non-`contenteditable` surface also makes Playwright's `fill()` actionability
wait block until the editor is bound, so the tests became deterministic with no test-side change.

**D — a mosaic story never painted on webkit** (1 of 10 runs, open). Did not reproduce locally
(35/35 over 5 repeats), so nothing was gated. It resembles the kanban webkit story-boot stall — a
`storybook dev` module arrival-order `ReferenceError` swallowed by the error boundary, gated with
evidence in `plugin-kanban/src/playwright/smoke.spec.ts` — but that evidence does not transfer to a
different storybook.

### Operation dispatch is concurrent by contract (serial dispatch: built, then reverted)

`invokePromise` dispatch is concurrent: each invocation runs on its own fiber, and handler
resolution can await a lazy handler's dynamic `import()`, so completion order is not issue order —
a stalled earlier `Select` can apply after a later click. This is the platform contract, pinned by
the "concurrency contract" test in `invoker.test.ts` (issued `[stale, newest]`, applied
`[newest, stale]`); a JSDoc restating it was reviewed away, so the test is the only guard.

Two alternatives were built, validated, and deliberately reverted — do not re-litigate from scratch:

1. **Per-key serial dispatch** (`dispatch: 'serial'`, tail-chained synchronously at the
   `invokePromise` call site) — commit `16df3608`; resurrect from there if something demands ordered
   dispatch more strongly. Its validation also measured a boundary worth keeping: passive focus
   (`handleAttend`) is not intent, and ordering it as intent put the marker on a sibling thread the
   reader never chose (1 in 5 two-worker runs).
2. **Direct atom writes bypassing `CommentOperation.Select`** — rejected because the operation owns
   the selection write; factoring the write out of the operation traded the abstraction for ordering.

The accepted consequence: comment selection flows through `CommentOperation.Select` under concurrent
dispatch, and **tests pace selection intents** — assert the marker has settled (`expectCurrent`)
between steps rather than racing distinct selections. `handleAttend` (passive attention, loses to
any later intent) and `handleComment`'s compare-and-set re-assert stay direct writes: they were
never the operation, and their semantics require applying at event time.

### Earlier shared causes, already fixed

Deferring one victim of a shared cause just moves the failure to another test next run, so these were
fixed rather than deferred:

| defect                                                                                | tests it was taking out                        |
| :------------------------------------------------------------------------------------ | :--------------------------------------------- |
| `createSpace()` clicked a remounting form                                             | ~24 composer tests, all browsers               |
| `createSpace()` could not tell a successful submit from a dialog that created nothing | any caller, intermittently                     |
| todomvc shipped unstyled — knip stripped `todomvc-app-css` from `index.html`          | 5 tests × 3 browsers                           |
| `lit-grid` storybook readiness probed by `port`, a bare TCP check                     | 1 of 3 tests in 5 of 6 non-chromium cells      |
| `todomvc` app-boot contention (2 workers × 2 apps per test)                           | intermittent, any test                         |
| `plugin-kanban` waited on a story's first paint with too short a budget               | 2 webkit tests                                 |
| `cli:bundle` could not resolve `@opentui/core-darwin-arm64`                           | the whole `cli` job, every run                 |
| the edge-replication wait in create-space had a 2 s deadline ordinary backlog exceeds | firefox create-space callers, dominant         |
| the first-run landing raced `plugin-space`'s forked workspace switch                  | `create identity, space is created by default` |

The edge-replication row is the rejection the removed retries exposed: `setEdgeReplicationPreference`
commits host-side, then waited 2 s for the local snapshot — queued behind every other space's
synchronized `_processSpaceUpdate` — and the timeout aborted create-space, discarding a space that
already existed. The wait is now budgeted like the RPC it confirms, and plugin-space treats it as
best-effort (`log.catch`). The guard is plugin-space `create.test.ts`'s rejecting stub (0 in 39
firefox after the fix); a client-side convergence test was deliberately deleted as a one-off proxy
harness with an irreducible 3 s delay.

The first-run row is a **product** bug the landing change surfaced. `plugin-space`'s `spaces-ready`
switches to the default space from a fiber forked off a `client.spaces.subscribe` callback, and
`SwitchWorkspace` restores the target workspace's persisted deck — empty on first run. Onboarding set
its plank before that fiber landed, so the switch wiped it and the user got an empty deck (2 of 5
locally; the trace's last snapshot showed the navtree with a `Home` node and no plank, at
`/w/<spaceId>` with no plank pairs). Onboarding now switches the workspace itself before setting the
plank, which also makes the forked switch's `workspace === 'default'` guard false: 6/6 after, and the
symptom is the "empty Home" that originally motivated landing on the README instead. The clobber
window closes at identity creation and holds nothing a user could navigate to, so it is not a general
navigation hazard — the onboarding landing is affected because it is necessarily inside that window.

Mosaic drag-and-drop was two **product** bugs, not test flake: `Mosaic.Placeholder` unregistered its
drop target for 500 ms on scroll (so a release in that window resolved to the container — "move to
end"), and `useEventHandlerAdapter.onDrop` then asked for index `length` in a list of `length - 1`,
which an ECHO array rejects after the removal commits. Both reachable by any user. The first fix
attempt was too permissive the other way (an idle ~8px placeholder could accept a release that used to
fall through), which webkit caught at 14/15 against a 15/15 baseline — the regression was only visible
because a baseline had been measured, since the doc already carried a note calling that test
webkit-flaky and it would have explained the failure away.

### Storybook-backed suites: readiness, not serialization

Every storybook suite (`lit-grid`, `plugin-sheet`, `react-ui-mosaic`, `plugin-kanban`, `react-ui-table`)
has the same shape: several tests race the first request of one shared story from `beforeEach`. The
shared root cause was **readiness probing**, and it is fixed once in `storybookWebServer(port)`
(`@dxos/test-utils/playwright`): with `webServer.port`, Playwright's probe is `isPortUsed()`, a bare TCP
check that `storybook dev` satisfies by binding the socket before it can serve — and Vite's
dep-optimization then restarts the server, so tests starting in that gap get ERR_CONNECTION_REFUSED.
Probing by `url` makes it an HTTP fetch, so the dep scan is done before any test starts.

`lit-grid` additionally carried `workers: 1`, which predated that fix and was removed once it landed:
24/24 tests over 8 runs at the preset's 2 workers, **firefox 3/3 and webkit 3/3** — the two browsers it
originally failed on, where it had lost 1 of 3 tests in 5 of 6 cells — plus chromium 2/2, each run
restarting storybook so the compile window was recreated rather than warmed. The condition **not**
reproduced was CI cell contention — and it recurred there on the next dispatched run (31501206028):
`mouse access` never painted within 30 s on **both** the firefox and webkit cells at 2 workers. The
override is restored with that run as its justification; the local 24/24 stands as proof the limit is
contention, not the suite.

## Refuted — do not retry these

Each was measured, not reasoned about, and each is worse than the baseline it tried to improve.

1. **Serving a built storybook to Playwright** instead of `storybook dev`: the build succeeds and then
   no story renders at all (4/4 timeouts). Refuted as a drop-in swap — but it is still the decided
   end state (a bundle's fixed evaluation order makes the story-boot race impossible), so the
   follow-up in TASKS.md starts by root-causing the no-render, not by re-trying the swap.
2. **Instrumenting the render path with console probes** to catch the marker race: the probe perturbs
   the timing under test (failures 4-in-39 → 7-in-16). Diagnostics must be DOM-only and test-side.
3. **Writing `current` synchronously in comment-sync's `onActivate`** before its nested `Select`:
   firefox went to 10 failed / 2 passed against a 4 / 16 baseline. Double-writing plausibly makes the
   companion reveal earlier, and the reveal steals attention mid-sequence — exactly what separating
   record from reveal fixed. Any future attempt must keep those separated.
4. **Treating "a pushed swarm state naming this peer" as a JOIN acknowledgment**, with a loop
   re-sending unconfirmed joins: false against the real edge, because a solo-member swarm gets no
   membership-change push, so nothing confirms and the loop re-sends forever. The in-memory
   `TestEdgeMesh` could not catch it because the same change authored the mock's push behaviour —
   **do not validate protocol semantics against a mock written in the same change.**

## Measurement hazards

Every one of these silently produced confident, wrong results.

- **A local result is only as good as the box it ran on.** A worker restart moved the session to a
  4-core container where 2-worker composer e2e starves itself (load 6.5, 12 of 18 failures unrelated
  to the code). Check `nproc && uptime` after any restart before comparing numbers.
- **The checkout can silently revert mid-session** to an older commit while `git status` reads clean —
  three times in one session, once _between_ a status check and a `git add -A`, which committed
  pre-fix sources. Verify with `git merge-base --is-ancestor <a-commit-you-made> HEAD`, and stage
  explicit paths rather than `-A`. Both hazards are in the
  [`cloud-sandbox`](../../skills/cloud-sandbox/SKILL.md) skill.
- **Selection/ordering defects need worker contention to reproduce.** Cause B passed 15/15 serially
  and failed 3/3 with the CI-parity 2 workers. Never clear one with `--workers 1`.
- **`curl` cannot health-check the moon cache from the sandbox** — the egress proxy relays 443 only,
  so port 9093 returns `000` whether the cache is up or down. The authoritative check is a real
  dispatch clearing the setup guard.
- **An unbuilt workspace package makes Playwright report "No tests found"** and exit as if it ran.
  After merging main, build before trusting a green. Likewise, after editing a library, rebuild it
  before `bundle-e2e` — a fix was once reverted because verification ran against a bundle that never
  contained it.
- **`test.skip()` inside `beforeEach` still runs `afterEach`.** An unguarded `page.close()` turned 5
  skipped webkit tests into 5 failures and reddened a cell in 7 of 11 runs. Use `await page?.close()`.
- **A local chromium run clears a test only if chromium is where it was failing.** Three comments
  tests were re-enabled on a green chromium loop and re-deferred when firefox and webkit took them out.
- **`pnpm format` can report success while leaving a file unformatted.** Verify with `oxfmt --check`,
  which is what CI runs — and note it is not always idempotent: on a markdown list item whose
  backticked span wraps across the 120-column bound, one `oxfmt` pass still failed `--check` and a
  second changed the file again. Reflow the prose so the span stays on one line rather than accepting
  whatever the formatter settles on; a single unformatted file fails the whole Check workflow.
- **A green Check can be reporting cache hits rather than runs.** Two storybook failures that looked
  like new flakes reproduced locally on the first try and predated the work; they had been passing on
  stale moon cache entries until an unrelated change invalidated the graph.

Diagnostics carry the weight these hazards leave behind — each replaced a bare locator timeout that
could not separate two different bugs, and each reads from the DOM or already-captured console output
so it costs nothing on a passing run: `Thread.expectCurrent` (which thread holds the marker — this is
what attributed cause B), `AppManager.recentConsoleErrors` (the create-space dialog's message is
generic by design; the cause is in the console tail via `log.catch`), `Markdown.select` reporting the
live editor's document length and head (which identified cause C), and
`ShellManager.authenticateInvitation` naming every rendered shell testid on timeout.

## Reading cache and hydration numbers

moon emits one completion line per task — `▮▮▮▮ <target> (cached from remote, <dur>, <hash>)` for a
hit against `▮▮▮▮ <target> (<dur>, <hash>)` for an execution — and that distinction is the basis of
every hydration measurement here. Strip ANSI escapes first (`sed 's/\x1b\[[0-9;]*[mJK]//g'`). A
build-vs-restore comparison needs two jobs in one run that resolved the **same task hashes**, one cold
and one warm, joined by target name. Job logs expire after ~7 days; re-dispatch `Check` to regenerate.

Two caveats that each produced a wrong conclusion once: **vite's build table undercounts output size
~3×** (it omits everything copied from `public/`), so measure with `du`/`find` over the real
directory; and `.moon/cache` is never restored by `actions/cache`, so on a fresh container every
"cached" task is necessarily a remote hydration — which is what makes hydration timings meaningful.

Historical note: the Depot-era finding that _restoring is often slower than rebuilding_ (8 of 12
tasks, up to 35× on `composer-app:prebuild`) has **not** been re-verified against `bazel-remote`,
where the same closure hydrates in ~12 s. It remains a live question only for tasks dominated by file
count rather than bytes. Composer's e2e bundle is 384 MB across 17 954 files, 46 % of it sourcemaps
Playwright does not need, with 48 MB of audio in 7 files that also ship to users.

## Open questions

1. **Concurrency.** One client pulling 449 MB is measured, on a laptop and on a runner; ten
   concurrent jobs are not, and that is where a shared-egress droplet could bind on bandwidth.
   Nothing so far has run more than one cache client at a time.
2. **Trust boundary for cache writes.** Any client with a certificate can write, and
   `bazel-remote` has no per-client ACL — so a developer's machine can currently poison CI's
   cache. The pnpm store already has a `cache-scope` isolation story for exactly this; the remote
   cache does not.
