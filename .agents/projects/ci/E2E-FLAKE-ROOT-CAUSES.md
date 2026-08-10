# E2E flake root causes

What the 9-cell Playwright matrix actually fails on, established by running the whole matrix ten
times in parallel and attributing every red cell. Companion to
[`E2E-STABILIZATION.md`](./E2E-STABILIZATION.md), which inventories the tests that are switched
**off**; this file covers the ones that are on and intermittently fail.

Two things here are load-bearing beyond the fixes themselves: the **refuted hypotheses**, each of
which cost a measured round-trip and looks plausible enough to be retried by the next person, and the
**measurement hazards**, which invalidated whole batches of local results before they were noticed.

## How to run a campaign

One run of `Check` with `e2e: true` produces 9 e2e cells (3 browsers × 3 `moon exec --job` shards).
`workflow_dispatch` keys its concurrency group on `github.run_id`, so dispatches do **not** cancel
each other and ten can run at once; every other event keeps one-run-per-ref.

```
mcp__github__actions_run_trigger  run_workflow  check.yml  ref=<branch>  inputs={"e2e":"true"}
```

**Count a run only if** the dispatch response echoed `inputs:{"e2e":"true"}` **and** the run contains
9 `e2e (browser, shard)` jobs. A wrong parameter name (`workflow_inputs` instead of `inputs`) produces
a run that looks normal and silently skips e2e entirely.

**Attribute a red cell by grepping its job log for `✘`** — not from the Trunk summary. A cell can exit
1 while Trunk reports 100% pass ("No test failures found, but non zero exit code") whenever a moon
task fails without emitting an XML row. Reconcile `Tasks: N completed, 1 failed` against the
`▮▮▮▮ <task>` banners in the log body.

## Results

| campaign             | runs | green | red cells                |
| :------------------- | ---: | ----: | :----------------------- |
| Round 3 (`e0d4e12e`) |   10 |     2 | 8 — one failed cell each |
| Sample (`0414d01a`)  |    3 |     0 | 4                        |

Both sets are dominated by one class. Every red cell reduced to four causes:

### Class A — the production-edge two-peer path (dominant)

Space invitations, device invitations, space replication and todo replication all stall, across all
three browsers and both apps: 5 of 8 red cells in round 3, 3 of 4 in the sample. One cause wearing
four costumes.

Server side (SigNoz, `service.name = 'edge'`, note the **lowercase** `severity_text = 'error'`):
`RouterObject` resets on Durable Object storage timeouts —
`Durable Object storage operation exceeded timeout which caused object to be reset` at
`RouterObject.webSocketMessage`, `router websocket message handling failed`,
`cannot access storage because object has moved to a different machine` (once directly inside
`_joinSwarm`) — plus `SubductionAutomergeReplicator`'s `process pass hung; abandoning invocation`
60 s watchdog. Bursts land inside the failing tests' wait windows to the second: the burst at
18:53:42 UTC sits inside a todomvc guest's 18:53:15–18:53:45 wait. The class is endemic, not
test-induced: 4–115 errors/hour at rest, spiking to 375–478/hour with no e2e load running.

Client side, `EdgeSignalManager.join()` sends one unacknowledged JOIN and `_rejoinAllSwarms()` only
fires on socket reconnect — so a message dropped by a router reset **on a socket that stays open**
strands the peer with no recovery path.

Tracked as **DX-1152** (assigned to Mykola) with the evidence table and reproducing queries.
`dxos/edge#840` (merged) removes the silent frame-drop in the three replicator sink dispatches and
closes the socket instead, which should heal the _replication_ costume — the client treats an abnormal
close as its cue to reconnect and re-drive sync. The _invitation_ costume is likely separate: those
paths already propagated errors, so the residual is most plausibly router state lost to a DO reset
while hibernated websockets survive. Ask #3 on DX-1152 (confirm JOIN acknowledgment semantics) is what
unblocks a client-side repair.

### Class B — comment marker landed on the wrong thread (fixed)

`selecting comment highlights thread and vice versa`, ~25 % of firefox samples.

The editor keyed comments by **URI**, and a thread's URI gains its space when its first message
persists it (`echo:///<id>` → `echo://<spaceId>/<id>`). Clicking a thread while a sibling persisted
made `scrollCommentIntoView`'s lookup miss, so it silently no-op'd: no `setSelection`, no caret move.
The debounced proximity tracker then wrote the _previous_ thread back over the click's selection —
terminal, with no self-heal.

Fixed by keying the editor's comments on the stable object id at the comment-sync boundary
(`Relation.getSource(anchor).id`), which also revived `onDelete`'s committed-thread branch (it had been
comparing a URI against an object id, so it was dead code). `CommentState.current` is documented as
compare-by-last-segment, since its writers disagree on spelling.

### Class C — text typed into an unbound editor was destroyed (fixed)

Surfaced as `editor never received the selection text … editor doc (0 chars): ""` — a document filled
with three paragraphs reading empty 15 s later.

While a `Markdown.Document`'s `content` ref is unresolved, `useExtensions` omits the automerge
extension, so the editor mounts **editable but unbound** and anything typed lives only in CodeMirror
state. When the ref resolves, the compartment attaches automerge and its attach-reconcile _replaces
the whole document_ with the loaded value — correct for the doc-swap case it was written for,
destructive here. Neither binding gated it: the default binding hardcodes `loading: false` and the
review binding's `loading` only covers branch/checkpoint/fork.

This is a **user-facing data-loss window**, not only a test problem: a reader who opens a
slow-loading document and types immediately loses those keystrokes.

Fixed in `useExtensions` — while `contentRef && !target`, the editor contributes
`EditorState.readOnly` **and** `EditorView.editable.of(false)` in place of the binding. Not
`readOnly` alone: that is advisory, whereas a non-`contenteditable` surface also makes Playwright's
`fill()` actionability wait block until the editor is bound, so the tests became deterministic with
no test-side change.

Five other surfaces share the conditional-binding shape and were **not** touched — `MarkdownField`,
`TemplateEditor`, `SpecArticle`, `CodeArticle`, `Outline`. Worth one shared fix (or a guard inside the
automerge extension) rather than five patches.

### Class D — mosaic story never painted on webkit (open, ungated)

`react-ui-mosaic` `Board › rearrange columns`: `board-column` never became visible inside 45 s
(1 of 10 runs, webkit). **Did not reproduce locally** — 35/35 green over 5 repeats — so nothing was
gated. It resembles the kanban webkit story-boot stall (a storybook-dev module arrival-order
`ReferenceError` swallowed by the error boundary, gated with evidence in
`plugin-kanban/src/playwright/smoke.spec.ts`), but that evidence does not transfer to a different
storybook and the CI rate is too low to act on yet.

## Refuted hypotheses — do not retry these

Each was measured, not reasoned about, and each is worse than the baseline it tried to improve.

1. **Serving a built storybook to Playwright** instead of `storybook dev`. The build succeeds and
   then no story renders at all: 4/4 timeouts, strictly worse than the dev server. That avenue is
   closed for the story-boot stalls.
2. **Instrumenting the render path with console probes** to catch the comment-marker race. The probe
   perturbs the timing under test — failures went from 4-in-39 to 7-in-16. All diagnostics must be
   DOM-only and test-side.
3. **Writing `current` synchronously in comment-sync's `onActivate`** before its nested `Select`
   invocation. Firefox went to 10 failed / 2 passed against a 4 / 16 baseline. Double-writing
   `current` plausibly makes the companion resolve and _reveal_ earlier, and the reveal steals
   attention mid-sequence — exactly what separating record from reveal fixed. Any future attempt here
   must keep those separated.
4. **Treating "a pushed swarm state naming this peer" as the JOIN acknowledgment**, with a repair loop
   re-sending unconfirmed joins. The predicate is false against the real edge: a solo-member swarm
   gets no membership-change push, so nothing ever confirms and the loop re-sends forever (observed
   6 times in ~60 s). The in-memory `TestEdgeMesh` could not catch this because the same change
   authored the mock's push behaviour — **do not validate protocol semantics against a mock you
   wrote in the same change.**

## Measurement hazards

Every one of these silently produced confident, wrong results.

- **A local test result is only as good as the box it ran on.** A worker restart moved the session to
  a 4-core container where 2-worker composer e2e starves itself (load average 6.5, planks never
  rendering, 12 of 18 failures with nothing to do with the code). Check `nproc && uptime` after any
  restart before comparing against earlier numbers. Details in the
  [`cloud-sandbox`](../../skills/cloud-sandbox/SKILL.md) skill.
- **The checkout can silently revert mid-session** to an older commit while `git status` reads clean —
  three times in one session, invalidating measurements that appeared to test the tip. Verify with
  `git merge-base --is-ancestor <a-commit-you-made> HEAD`. Also in the `cloud-sandbox` skill.
- **Class B needs worker contention to reproduce.** It passed 15/15 run serially and failed 3/3 with
  the CI-parity 2 workers. Never validate a selection/ordering defect with `--workers 1`.
- **`curl` from the sandbox cannot health-check the moon cache.** The egress proxy relays 443 only, so
  port 9093 returns `000` whether the cache is up or down. The authoritative check is a real
  workflow dispatch clearing the setup guard.
- **An unbuilt workspace package makes Playwright report "No tests found"** and exit as if it ran —
  a run that looks executed but tested nothing. After merging main, build before trusting a green.
- **`test.skip()` inside `beforeEach` still runs `afterEach`.** An unguarded `page.close()` in
  teardown turned 5 skipped webkit tests into 5 failures and reddened a cell in 7 of 11 runs. Guard
  with `await page?.close()`.

## Diagnostics that made these attributable

Each replaced a bare locator timeout that could not distinguish two different bugs. They cost nothing
on a passing run (all read from the DOM or from already-captured console output).

- `Thread.expectCurrent` — reports every thread's and comment mark's marker state, so a missing
  marker is distinguishable from one on the wrong thread. This is what attributed Class B.
- `AppManager.recentConsoleErrors` in the create-space failure path — the dialog's message is generic
  by design, and the real cause is in the console tail via `log.catch`.
- `Markdown.select`'s failure reports the live editor's document length and head — which is what
  identified Class C rather than a slow fill.
- `ShellManager.authenticateInvitation` names every rendered shell testid on timeout, so a stalled
  invitation says which state it stalled in.

Retries are deliberately absent throughout (`e2ePreset` sets `retries: 0`, and two retry loops were
removed from `app-manager.ts`). A retry converts a product defect into a slow pass: removing the
create-space retries is what exposed the real rejection they had been masking.
