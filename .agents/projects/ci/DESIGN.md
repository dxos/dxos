# CI — design notes

The build/test pipeline itself: runners, caching, and the workflows in `.github/workflows`.
Measurements live in [`REPORT.md`](./REPORT.md), open work in [`TASKS.md`](./TASKS.md), and the
cache's operational runbook in [`tools/moon-cache/`](../../../tools/moon-cache/README.md).

## Shape of the pipeline

One workflow, **Check** (`.github/workflows/check.yml`) — build, test, lint, fmt. Seven job types
on `depot-ubuntu-24.04-8`, all inside `ghcr.io/dxos/gh-actions`, with e2e sharded further. Roughly
300 tasks in the composer-app dependency closure, so ~10 concurrent cache clients per run.

Everything routes through `moon`, and `.moon/workspace.yml` decides where the remote cache lives.

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

## Cache: where it stands

Depot's hosted cache hydrates a 324-task `:build` in ~1,100 s; a self-hosted `bazel-remote` does it
in ~86 s from the same machine at the same RTT. The cost is not bandwidth and not network latency —
it is invariant to where the client sits, which is why it does not improve on a Depot runner
either. Full analysis in [`REPORT.md`](./REPORT.md).

Settled: a self-hosted `bazel-remote` on a DigitalOcean droplet in NYC3, behind mTLS, on Depot
runners. Blacksmith was evaluated as an alternative runner and rejected — REPORT.md, "Runners".

## E2E: how the suite is sharded

Two axes into 9 matrix cells — browser (`PLAYWRIGHT_BROWSER`) × `moon exec --job N --job-total 3`,
with composer-app opting out of the inherited `e2e-ci` to supply `e2e-ci-1of2` / `-2of2` because it is
too big for one cell. Job layout, the two rejected sharding strategies and their measured numbers are
in [`.github/workflows/README.md`](../../../.github/workflows/README.md).

**Retries are absent by policy** (`e2ePreset` sets `retries: 0`; two retry loops were also removed
from composer's `app-manager.ts`). A retry converts a product defect into a slow pass — removing the
create-space retries is what exposed the real rejection they had been masking. An unstable test gets
`test.fixme` with evidence, never a retry.

Runtime, cold cache: e2e's slowest shard is 7.7 min (6.2 warm) against `test` at 12.8 min and
`storybook` at 9.4 min. **E2E is no longer the critical path — `test` is.**

### Running a campaign, and attributing a red cell

One dispatch of `Check` with `e2e: true` produces the 9 cells; `workflow_dispatch` keys its
concurrency group on `github.run_id`, so dispatches do not cancel each other and ten can run at once.

**Count a run only if** the dispatch response echoed `inputs:{"e2e":"true"}` **and** the run contains
9 `e2e (browser, shard)` jobs — a wrong parameter name (`workflow_inputs`) yields a run that looks
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

**B — the comment marker landed on the wrong thread** (~25 % of firefox samples, fixed). The editor
keyed comments by **URI**, and a thread's URI gains its space when its first message persists it
(`echo:///<id>` → `echo://<spaceId>/<id>`). Clicking a thread while a sibling persisted made
`scrollCommentIntoView`'s lookup miss and silently no-op, after which the debounced proximity tracker
wrote the previous thread back over the click — terminal, no self-heal. Fixed by keying on the stable
object id at the comment-sync boundary, which also revived `onDelete`'s committed-thread branch (it had
been comparing a URI against an object id, so it was dead code). `CommentState.current` is documented
as compare-by-last-segment, since its writers disagree on spelling.

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

### Earlier shared causes, already fixed

Deferring one victim of a shared cause just moves the failure to another test next run, so these were
fixed rather than deferred:

| defect                                                                                | tests it was taking out                   |
| :------------------------------------------------------------------------------------ | :---------------------------------------- |
| `createSpace()` clicked a remounting form                                             | ~24 composer tests, all browsers          |
| `createSpace()` could not tell a successful submit from a dialog that created nothing | any caller, intermittently                |
| todomvc shipped unstyled — knip stripped `todomvc-app-css` from `index.html`          | 5 tests × 3 browsers                      |
| `lit-grid` storybook boot contention                                                  | 1 of 3 tests in 5 of 6 non-chromium cells |
| `todomvc` app-boot contention (2 workers × 2 apps per test)                           | intermittent, any test                    |
| `plugin-kanban` waited on a story's first paint with too short a budget               | 2 webkit tests                            |
| `cli:bundle` could not resolve `@opentui/core-darwin-arm64`                           | the whole `cli` job, every run            |

Mosaic drag-and-drop was two **product** bugs, not test flake: `Mosaic.Placeholder` unregistered its
drop target for 500 ms on scroll (so a release in that window resolved to the container — "move to
end"), and `useEventHandlerAdapter.onDrop` then asked for index `length` in a list of `length - 1`,
which an ECHO array rejects after the removal commits. Both reachable by any user. The first fix
attempt was too permissive the other way (an idle ~8px placeholder could accept a release that used to
fall through), which webkit caught at 14/15 against a 15/15 baseline — the regression was only visible
because a baseline had been measured, since the doc already carried a note calling that test
webkit-flaky and it would have explained the failure away.

## Refuted — do not retry these

Each was measured, not reasoned about, and each is worse than the baseline it tried to improve.

1. **Serving a built storybook to Playwright** instead of `storybook dev`: the build succeeds and then
   no story renders at all (4/4 timeouts). That avenue is closed for the story-boot stalls.
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
  which is what CI runs.
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
