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

### 6. `react-ui-mosaic › Board › rearrange columns` — a wrong result, not a timeout

The only failure in the whole set that is not a hang: the drag ran and the assertion read
`Column 2` where `Column 1` was expected (run 31107630885). That is an ordering bug in the product,
not test flake, and should be triaged as such rather than as a test fix.

### 7. Drag-and-drop flakes

- `react-ui-mosaic › Board › rearrange within column` (firefox)
- `plugin-kanban › Kanban MutableSchema › rearrange columns` (webkit, passed 5/5 the run before)

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
