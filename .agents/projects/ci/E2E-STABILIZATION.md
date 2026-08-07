# E2E test stabilization

Every disabled Playwright test in the repo, grouped by root cause and ordered by how cheap the fix
looks. Produced by a flake sweep that ran the 9-cell e2e matrix repeatedly, deferring each failure
until the suite ran green (see [How this list was built](#how-this-list-was-built)).

**42 tests are off**: 16 `test.fixme`, 11 `test.skip`, and 5 `test.describe.skip` suites covering a
further 15.

The ordering matters more than the count. Composer's deferrals are not independent flaky tests —
they trace to a handful of page-object helpers in `app-manager.ts`. Fixing a helper re-enables every
test that calls it, so the top of this list is worth more than its item count suggests.

## Tier 1 — specified fix, no investigation needed

### 1. `createObject()` uses a forbidden selector — unblocks 1 test now, hardens ~15

`app-manager.ts` does `getByRole('listbox').getByText(type).first().click()`. The
`browser-e2e-tests` skill forbids exactly this: _"target by `data-testid`, never by label, text, or
role-name"_. It timed out at 30s in run 31138598029.

Fix: add a testid to the type-picker option and target it. Every `createObject()` caller benefits —
that is most of composer's suite — so this is the highest-leverage item here.

- `composer-app` `Collection tests › deletion undo restores collection`

### 2. Four suites disabled wholesale with a stated, checkable condition

Each is a `describe.skip` whose reason is recorded and testable — no diagnosis, just verification of
whether the condition still holds.

- `composer-app` `First-run tests` (2 tests) — "trigger for joyride is currently part of beta auth flow"
- `composer-app` `Inbox` (4 tests) — disabled in #12481 while mail sync moves to EDGE
- `composer-app` `Table tests` (6 tests) — "Fix table tests", no further detail
- `composer-app` `Welcome focus` (2 tests) — no stated reason

Re-enabling `Inbox` and `Table tests` alone returns 10 tests.

A fifth suite, `devtools-extension` `Basic test` (1 test), is off because Playwright cannot load
extensions headless. That is a real platform constraint and likely stays off.

### 3. Deletions rather than fixes

Three carry a `Remove?` note from a previous pass. Deciding to delete them is cheaper than fixing them.

- `composer-app` `Basic tests › reset app` — the reset button was removed from the app
- `react-ui-table` `Table › extant relations work as expected` — duplicates a story play function
- `react-ui-table` `Table › new relations work as expected` — same

Three more have no stated reason at all and cannot be re-enabled with any confidence until someone
records why they went off: `examples › Demo › airplane mode`, `examples › Demo › batching`,
`react-ui-table › Table › test toggles`.

## Tier 2 — one shared cause, needs trace artifacts

### 4. `joinNewIdentity()` → device-invitation shell never mounts — unblocks 2 tests

Both halo tests fail identically: 30s timeout filling `halo-invitation-input`
(`scoped-shell-manager.ts:28`) after `joinNewIdentity()` resets storage and reloads. Runs
31131235658 and 31137756950. `halo.spec.ts` currently has no live tests.

- `composer-app` `HALO tests › join new identity`
- `composer-app` `HALO tests › deleting a space replicates across devices`

### 5. Comments deletion paths — 4 tests, probably one cause

All four failures are in the delete/undo flow, across firefox, webkit and chromium. Worth one
investigation rather than four.

- `delete message`, `delete thread`, `undo delete thread`, `selecting comment highlights thread and vice versa`
- Also here: `Collection tests › delete a collection` (firefox, run 31046879125)

### 6. todomvc replication — 2 tests, one cause

Both are host→guest replication assertions that never settle. Same suite, same WebRTC two-peer setup.

- `Default space › edit a task` — the edit never reached the guest
- `Default space › toggle all tasks & clear completed` — `toBeChecked` never settled

## Tier 3 — genuine product bugs or hard races

### 7. `react-ui-mosaic › Board › rearrange columns` — a wrong result, not a timeout

The only failure in the whole set that is not a hang: the drag ran and the assertion read
`Column 2` where `Column 1` was expected (run 31107630885). That is an ordering bug in the product,
not test flake, and should be triaged as such rather than as a test fix.

### 8. Drag-and-drop flakes

- `react-ui-mosaic › Board › rearrange within column` (firefox)
- `plugin-kanban › Kanban MutableSchema › rearrange columns` (webkit, passed 5/5 the run before)

### 9. Collaboration and presence — awareness-channel races

- `Collaboration tests › guest joins host's space` — `toHaveText` mismatch
- `Collaboration tests › host and guest can see each others' changes` — markdown textbox focus timeout
- `Collaboration tests › host and guest can see each others' cursors` (`skip`) — documented as
  depending on winning a race the test cannot observe; the note says storybook covers it instead
- `Collaboration tests › peers can see each others presence` (`skip`) — "Fix."

`collaboration.spec.ts` has no live tests.

### 10. Startup harness

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

Two CI-hygiene changes make the remaining signal trustworthy: `retries: 0`, so a flake fails loudly
instead of costing 3× the runtime; and `quarantine: false` on the Trunk uploader, after two cells in
run 31111016212 reported success while a test failed.
