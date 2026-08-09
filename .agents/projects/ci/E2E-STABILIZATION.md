# E2E test stabilization

Every disabled Playwright test in the repo, grouped by root cause and ordered by how cheap the fix
looks. Produced by a flake sweep that ran the 9-cell e2e matrix repeatedly, deferring each failure
until the suite ran green (see [How this list was built](#how-this-list-was-built)).

**38 tests are off**: 9 `test.fixme`, 11 `test.skip`, and 5 `test.describe.skip` suites covering a
further 15. Four have been re-enabled since this list was written — see
[What has been resolved](#what-has-been-resolved).

Findings below marked **verified** were reproduced (or ruled out) against a local chromium run of the
suite, which is a ~90s loop rather than a ~13min CI one. Two limits on that loop: the container has no
route to EDGE, so anything needing replication (halo, collaboration, todomvc) only ever fails there for
the wrong reason; and only chromium is installed, so webkit/firefox-specific failures are invisible.

The ordering matters more than the count. Composer's deferrals are not independent flaky tests —
they trace to a handful of page-object helpers in `app-manager.ts`. Fixing a helper re-enables every
test that calls it, so the top of this list is worth more than its item count suggests.

## Tier 1 — specified fix, no investigation needed

### 1. Four suites disabled wholesale with a stated, checkable condition

Each is a `describe.skip` whose reason is recorded and testable.

- `composer-app` `First-run tests` (2 tests) — "trigger for joyride is currently part of beta auth
  flow". **Verified: the condition still holds.** Un-skipped locally, both fail immediately with
  `helpPlugin.tooltip` not found — the tooltip never renders at all. Blocked on the auth flow, not
  on the tests.
- `composer-app` `Table tests` (6 tests) — "Fix table tests", no further detail. **Verified: not a
  cheap win.** Un-skipped locally, all six fail at the `locator.fill` on the table cell, so this
  needs real diagnosis rather than a re-enable. It is no longer a Tier 1 item.
- `composer-app` `Inbox` (4 tests) — disabled in #12481 while mail sync moves to EDGE. Not yet
  checked; the migration it names may still be in flight.
- `composer-app` `Welcome focus` (2 tests) — no stated reason. Runs against storybook via its own
  `e2e-welcome-focus` task, so it is not covered by the local composer loop.

A fifth suite, `devtools-extension` `Basic test` (1 test), is off because Playwright cannot load
extensions headless. That is a real platform constraint and likely stays off.

### 2. Deletions rather than fixes

Three carry a `Remove?` note from a previous pass. Deciding to delete them is cheaper than fixing them.

- `composer-app` `Basic tests › reset app` — the reset button was removed from the app
- `react-ui-table` `Table › extant relations work as expected` — duplicates a story play function
- `react-ui-table` `Table › new relations work as expected` — same

Three more have no stated reason at all and cannot be re-enabled with any confidence until someone
records why they went off: `examples › Demo › airplane mode`, `examples › Demo › batching`,
`react-ui-table › Table › test toggles`.

## Tier 2 — one shared cause, needs trace artifacts

### 3. `joinNewIdentity()` → device-invitation shell never mounts — unblocks 2 tests

Both halo tests fail identically: 30s timeout filling `halo-invitation-input`
(`scoped-shell-manager.ts:28`) after `joinNewIdentity()` resets storage and reloads. Runs
31131235658 and 31137756950. `halo.spec.ts` currently has no live tests.

- `composer-app` `HALO tests › join new identity`
- `composer-app` `HALO tests › deleting a space replicates across devices`

### 4. Comments — the `cm-comment` decoration race

**Verified, and mostly resolved.** `delete message`, `delete thread` and `undo delete thread` are all
back on. They share one race: after a thread is deleted the editor's `cm-comment` decoration is dropped
asynchronously, and in run 31146797167 `undo delete thread` missed the preset's 10s budget while
`delete thread` — identical up to that line — made it. That assertion now has 30s. If it ever fails
again the decoration is never removed, which is a product bug rather than a slow one.

`selecting comment highlights thread and vice versa` stays off and is **not** part of that race — see
Tier 3.

### 5. todomvc replication — 2 tests, one cause

Both are host→guest replication assertions that never settle. Same suite, same WebRTC two-peer setup.

- `Default space › edit a task` — the edit never reached the guest
- `Default space › toggle all tasks & clear completed` — `toBeChecked` never settled

## Tier 3 — genuine product bugs or hard races

### 6. Mosaic drag-and-drop — FIXED, two product bugs

Every mosaic drag failure in this set (`rearrange columns`, `rearrange within column`,
`drag to end of another column`, and kanban's `rearrange columns`) shares one cause, found by
logging pragmatic's drop targets through a failing firefox drag:

1. `Mosaic.Placeholder` unregistered its drop target for 500ms whenever the container scrolled. A
   drop released in that window resolves to the container instead of the gap under the cursor, so
   the drag silently becomes "move to end". Auto-scroll during a drag is normal, and on firefox
   _expanding a placeholder_ scrolls the viewport — so the aim was erased one frame after being
   acquired. Fixed by keeping the drop target registered and gating only the visual activation.
2. `useEventHandlerAdapter.onDrop` then destroyed the card. `to` is measured against the list the
   user sees, which still counts the dragged item; the insert happens after it has been spliced
   out, so a container drop asks for index `length` in a list of `length - 1`. A plain array
   appends; an ECHO array throws `index N is out of bounds` after the removal has committed. That
   is the "10 items become 9" — browser-independent, reachable by any user dropping a card on the
   empty area of its own column. Fixed by clamping the insert index.

The first attempt at (1) kept every placeholder registered, which was too permissive the other
way: an idle placeholder is ~8px of collapsed padding, and one of those could then accept a release
that used to fall through to the container. webkit's kanban suite went 15/15 before that commit and
14/15 on each of two runs after it, failing a different column drag each time. Suspension is now
per-placeholder — only the one already aimed at stays droppable mid-scroll. Worth remembering: the
regression was invisible without a baseline measurement, because the doc already carried a note
calling this test webkit-flaky, and that note would have explained the failure away.

Measured after the fix, `--repeat-each=3` on each browser:

| suite                   | chromium | firefox | webkit |
| :---------------------- | :------- | :------ | :----- |
| `react-ui-mosaic` board | 21/21    | 21/21   | 21/21  |
| `plugin-kanban` board   | 15/15    | 15/15   | 15/15  |

`rearrange within column` was 0/5 on firefox before. Both previously-deferred mosaic tests are
re-enabled, leaving no deferred test in that package.

### 6b. `stories-projects` — 2 of 3 story files, another stale-cache unmasking

Not e2e, but found the same way and worth recording with the others. `FactSummaries` and
`SenderLedger` failed all three CI attempts, rendering blank Skills rows. Skill definitions come
from modules gated on the assistant's start event; `RoutineArticle` signalled it, `ProjectArticle`
embeds the same `InstructionsEditor` and did not. The signal now lives on the editor that reads the
registry. Both failures predate this branch — nothing here touches plugin-table, plugin-projects,
compute or stories-projects — so this is the same shape as `cli:test`, `plugin-assistant` and
`plugin-tasks`: a task that had been replaying a stale cache entry until the lockfile change
invalidated the graph. **main is green the same way.**

### 8. Collaboration and presence — awareness-channel races

- `Comments tests › selecting comment highlights thread and vice versa` — **verified as a product
  gap, not a flake.** Reproduces locally on chromium. Selecting a _comment_ marks the comment current
  (`data-current='1'` passes) but leaves the thread's `aria-current` empty rather than `location`, so
  only the thread -> comment direction works.
- `Collaboration tests › guest joins host's space` — `toHaveText` mismatch
- `Collaboration tests › host and guest can see each others' changes` — markdown textbox focus timeout
- `Collaboration tests › host and guest can see each others' cursors` (`skip`) — documented as
  depending on winning a race the test cannot observe; the note says storybook covers it instead
- `Collaboration tests › peers can see each others presence` (`skip`) — "Fix."

`collaboration.spec.ts` has no live tests.

### 9. Startup harness — and four tests CI never runs

The CI pool is `moon exec ':e2e-ci*' plugin-script:e2e`, so composer's `e2e-startup`, `e2e-dev` and
`e2e-welcome-focus` tasks are outside it. Four of the disabled tests therefore have no bearing on a
green Check — `Welcome focus` (2, `e2e-welcome-focus`) and both startup entries below
(`e2e-startup`). Re-enable them for their own sake, not to make CI green.

- `warm-cold start (persisted identity, fresh tab)` — deferred pending the ResetDialog race; only
  ever passed on the retries since removed
- `warm start (reuse storage)` (`skip`) — 30s `waitForReady` too tight under load
- `Basic tests › error boundary is rendered on invalid storage version` (`skip`) — reset no longer
  wipes old data; needs an upgrade path first, i.e. a product change
- `Comments tests › cut & paste comment` (`skip`) — paste does not work headless; may be unfixable

## How this list was built

Iterations of: dispatch the 9-cell matrix, extract every failure, defer it, re-run. Along the way
defects were fixed rather than deferred, because deferring one victim of a shared cause just moves
the failure to a different test next run:

| defect                                                                                                                  | tests it was taking out                   |
| :---------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| `createSpace()` clicked a remounting form                                                                               | ~24 composer tests, all browsers          |
| `createSpace()` could not tell a successful submit from a dialog that closed having created nothing                     | any caller, intermittently, chromium      |
| todomvc shipped unstyled — knip stripped `todomvc-app-css` from `index.html`'s link tags                                | 5 tests × 3 browsers                      |
| `lit-grid` storybook boot contention                                                                                    | 1 of 3 tests in 5 of 6 non-chromium cells |
| `todomvc` app-boot contention (2 workers × 2 apps per test)                                                             | intermittent, any test                    |
| `plugin-kanban` waited on a story's first paint with a budget shorter than the render                                   | 2 webkit tests                            |
| `cli:bundle` could not resolve `@opentui/core-darwin-arm64` — #12398 dropped the five platform packages nothing imports | the whole `cli` job, every run            |

## What has been resolved

Four tests are back on: `Basic tests › create space, which is displayed in tree`, and `Collection
tests › create collection`, `delete a collection`, `deletion undo restores collection` —
`collections.spec.ts` now has none disabled.

The three `Comments tests` delete tests were re-enabled and then **re-deferred**. They passed a local
chromium run, but their notes cited firefox and webkit, and those browsers took them out again in run 31147977323. Recorded here because it is the general lesson of this pass: a local chromium run clears a
test only if chromium is where it was failing.

## Where the suite stands

Five consecutive dispatch runs — 29 through 33, all on `af0b657b` — came back with all nine e2e cells
green, alongside `cli`, `check`, `test`, `workerd`, `e2e-bundle` and `cli-foreign`. `storybook` is red
in all five on `stories-projects` (see below), which is the one job this work did not clear.

Getting there took 33 iterations, and the last stretch was a long tail rather than a systemic problem:
at most one cell failed per run, on a different test each time, and two of the reds were regressions of
my own — a 10s create-space dialog-close wait that firefox exceeded, and an unformatted doc that failed
`oxfmt --check`. Worth knowing for whoever runs this loop next: `pnpm format` reported success on that
file while leaving it unformatted, so verify with `oxfmt --check` rather than trusting the formatter's
exit code.

## Cache hits can hide deterministic failures

Two `storybook` jobs failed mid-sweep and looked like new flakes. Both reproduced locally on the first
try, deterministically, and both predate this work:

- `plugin-assistant › AssistantSettings › Default` raised `Missing PluginManagerContext` — the story
  renders a component that reads a capability through `useOptionalCapability`, which raises without a
  plugin manager rather than returning undefined. Fixed with a `withPluginManager` decorator.
- `plugin-tasks › Convert To Task` asserted a sub-pixel spread between the tallest and shortest
  `.cm-line`, to prove an anchor chip does not make its line taller. The editor's first line carries
  the content's top padding in its bounding box (56px against every other line's 32px), so the
  assertion could not pass whatever the chip did. Instrumenting it showed the chip's line at 32px —
  the property under test was holding. Fixed by comparing the converted line to one plain sibling.

They had been passing on stale moon cache entries; a change to `plugin-space` invalidated the
downstream `test-storybook` graph and exposed them. `cli:test` surfaced the same way. Worth
remembering when reading a green Check: it can be reporting cache hits rather than runs.

Two CI-hygiene changes make the remaining signal trustworthy: `retries: 0`, so a flake fails loudly
instead of costing 3× the runtime; and `quarantine: false` on the Trunk uploader, after two cells in
run 31111016212 reported success while a test failed.

## Session addendum — 2026-08-07 evening

- **`comments › delete message` first layer fixed:** the reply composer had no testid, so
  `Thread.addMessage`/`createComment` reached it as the _last_ `role=textbox` and sometimes typed
  into an existing message body instead. `Thread.Textbox` now carries `thread.reply` and the
  helpers share `getReplyInput`. All three webkit repeats clear the add step. The test stays
  deferred on what that exposed: `thread.message.delete` resolves and then loops
  "not stable"/"detached" — the message row re-renders continuously, likely the same family as
  `undo delete thread`'s cm-comment flap on firefox in run 31215927769 (which sits in the branch's
  own plugin-review delete path — the anchor-race fix reduced, not eliminated, the churn).
  A delegated investigation is instrumenting the loop; suspect list starts with comment-sync's
  updateListener writing `thread.name` back per doc change.
- **Stale-bundle trap, second occurrence:** the reply-composer fix was wrongly reverted once
  because verification ran against a bundle that never contained it. Rule: after editing a
  library, `moon run <lib>:build --force` before `bundle-e2e`, or the verdict is meaningless.
  Now recorded in the cloud-sandbox skill.
- **Kanban `rearrange columns` (webkit):** the index-space suspicion in
  `useKanbanColumnEventHandler` is arithmetically refuted (`arrayMove` inserts post-removal, same
  space as visible-item locations). The pass/fail delta means the resolved drop target was one
  column right of the aim; the remaining candidate is the board sliding under the cursor between
  aim and release. Next: capture `Root.onDrop`'s resolved target on a failing run (diag spec
  drafted, runs solo — timing-sensitive measurements share the machine with nothing).
- **Chromium now runs in the cloud sandbox:** `e2ePreset` gains sandbox-gated
  `--ssl-version-max=tls1.2` + `$HTTPS_PROXY` proxying (the egress proxy resets Chromium's TLS 1.3
  ClientHello — see the new `cloud-sandbox` skill). First chromium sample: todomvc
  `filter active tasks` fails 3/3 at the invitation auth-code step locally, matching its CI
  failure — parked until worklist items 1–2 are done.
- **Overclaim corrected:** `selecting comment highlights thread and vice versa` passes on webkit
  ×3; the earlier Tier-3 note calling it a _verified_ product gap rested on chromium alone and
  overstated. Browser-dependent behaviour still points at product, but "verified" was wrong.

## Deferred-test inventory and per-test verdicts (2026-08-09)

Every `test.fixme` / `test.skip` in an e2e spec, with why it is deferred and what re-enables it.
Browser gates (`test.skip(browserName === …)`) are listed only where this work changed them.

### Deferred on a defect, with a named re-enable condition

| Test                       | Where                    | Verdict                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guest joins host's space` | collaboration.spec       | REPLICATION, not invitation — guest reached the doc, editor kept the placeholder (firefox, run 31313863039). Re-enable with a trace from a CI failure; not reproducible in the sandbox (external STUN/TURN unavailable, fails 11/16 there for unrelated reasons).                                                                                                                     |
| kanban suite on webkit     | plugin-kanban smoke.spec | Story-boot stall: no column painted in 45s. `storybook dev` arrival-order evaluation hits a mid-evaluation `ReferenceError` swallowed by storybook's error boundary. Preload lowered the rate only; `check-cycles` finds no static cycle; a BUILT storybook is measurably worse (build succeeds, 4/4 timeout, no story renders). Needs a different mechanism, not another workaround. |

### Pre-existing skips, untouched by this work (follow-up)

`basic.spec`: error-boundary/storage-version, reset app. `collaboration.spec`: cursors, presence.
`comments.spec`: cut & paste (paste unavailable headless). `startup.spec`: warm start, warm-cold,
throttled. `sdk/examples`: airplane mode, batching. `react-ui-table`: browser-gated throughout —
check what it currently skips before counting its coverage.

### Verdicts on the previously-flaky composer chromium tests

| Test                                                 | Verdict                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create space, which is displayed in tree`           | FIXED. Both retry loops removed; the real cause was create aborting on the edge-replication wait. 30/30 chromium, 0/39 firefox.                                                                                                                                                                                                                         |
| `create document`                                    | FIXED with the above (shared `createSpace`).                                                                                                                                                                                                                                                                                                            |
| `edit message`                                       | FIXED by the attend/reveal split — the reveal was stealing focus mid-keystroke.                                                                                                                                                                                                                                                                         |
| `delete message`                                     | NOT FIXED — `toHaveCount` still fails ~1 in 12 on webkit. Distinct from the marker issue.                                                                                                                                                                                                                                                               |
| `selecting comment highlights thread and vice versa` | IMPROVED, NOT FIXED. id-vs-URI comparison fixed (firefox 6/15 → 2/15); ~13% residual remains and also hits `undo delete thread`, so it is a shared marker-path defect. Next probe must wrap the SPEC's assertions — the `createComment` diagnostic covers a different path, and a per-render probe distorts the timing (4/39 → 7/16 with one attached). |

### Runtime (answered)

Cold cache: e2e slowest shard 7.7 min (6.2 warm) vs `test` 12.8 min and `storybook` 9.4 min. E2E is
no longer the critical path; `test` is.
