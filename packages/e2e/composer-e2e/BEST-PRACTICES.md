<!-- Copyright 2026 DXOS.org -->

# Writing Composer e2e tests

Distilled from the specs in `src/playwright`, and from the defects they were each written after.
Every rule below is one somebody paid for.

Browser e2e is the only tier that verifies _perceived_ behaviour: that the app stays interactive
during async work, that an empty state is real rather than a race, that click → render actually
completes. It is also the slowest and most expensive tier by an order of magnitude. Both facts
follow from the same property — it drives the real app — and both should inform what you put here
rather than in a vitest or a storybook interaction test.

## 1. Every test is the automated arm of a `.mdl` QA flow

A `test QA-n` block in an `.mdl` is the specification of a journey; a spec here is one unattended
execution of it. The binding is declared on both sides:

```ts
test('create document', { tag: ['@QA-1'] }, async () => { … });
```

```mdl
test QA-1: Spaces and documents
  automated:
    - composer-e2e:basic.spec.ts#Basic tests › create document
```

`scripts/check-qa-coverage.mjs` fails the build when either side names something the other does
not have, and when the tag does not name that flow. The duplication is the point: a one-sided link
rots silently — rename a test and the suite stays green while the flow it claimed to cover stops
being exercised.

**The check is referential, not semantic.** It proves the two sides agree on names and that the
named test runs; it cannot decide whether your spec exercises the flow's `steps`. A test tagged
`@QA-1` that asserts nothing passes it. Whether the coverage is real is a reviewer's call — so make
the spec's assertions recognisably the flow's, and say in review which steps you did not cover.

**A skipped test carries its tag but is not coverage.** `automated:` lists only tests that actually
run, so a `test.skip` — or anything under a `test.describe.skip`, since skipping is inherited —
must be left out of it, and the checker rejects an entry naming one. The tag stays so the flow is
still findable from the spec; the `automated:` entry goes back when the test does. `tables.spec.ts`
and `inbox.spec.ts` are whole-suite skips today, so `table:QA-1` and `inbox:QA-1` have no automated
coverage at all — which is the true state, and the point of not letting a list claim otherwise.

**Write the flow first.** If there is no `QA-n` for what you are about to test, add one to the
owning `.mdl` (`APP.mdl` for a journey crossing plugins, the plugin's `PLUGIN.mdl` otherwise). It
costs ten minutes and it is what a human re-runs when your spec goes red at 3am. A flow's steps are
prose a person can follow; they are not made redundant by the spec, because a spec asserts only
what it was written to assert.

The spec may cover a subset of the flow, and usually does — `after` is teardown the runner does not
need when every worker gets a fresh profile, and a step with no operation behind it (a drag, a
reload, a judgement about flicker) may be the whole reason the flow is `actors: human`.

A tag whose prefix names another plugin (`@review:QA-1`) binds to that plugin's spec; register the
prefix in `SPEC_FILES` in the checker.

## 2. Target by `data-testid`. Never by label, text, or role name

Labels come from `translations.ts` and change with copy and i18n; role names are ambiguous the
moment two controls share one. `data-testid` is the only stable selector.

```ts
page.getByTestId('inbox.message.reply'); // yes
page.getByRole('button', { name: 'Reply' }); // no
page.getByText('Send');
page.getByLabelText('To'); // no
```

**If the element has no testid, add one to the component as part of writing the test.** A missing
testid is a source gap, not a licence to fall back to a label.

- Plain elements and most `@dxos/react-ui` primitives forward `data-testid`; `Form.Submit` renders
  `data-testid='save-button'`.
- **Menu and toolbar actions (`@dxos/react-ui-menu`) emit a testid only when the action sets
  `properties.testId`.** A `label` and an `icon` alone produce none. This is the single most common
  reason a "there is no testid" conclusion is wrong.
- Name them `plugin.area.element`, matching what exists: `spacePlugin.object`, `deck.plank`,
  `composer.markdownRoot`, `create-object-form`.

Where a testid genuinely cannot exist yet, prefer framework state that encodes _behaviour_ —
`aria-selected`, `aria-current`, a Mosaic tile's `id`, `dx-current` — over anything a translator
can edit. Role selectors are acceptable only scoped inside a testid'd container.

Visible text is for **assertions about content**, never for **locating controls**. `expect(plank)
.toContainText('Collection 2')` is fine; finding that row by its text is not.

## 3. Selectors live in page objects, never in specs

A spec should read as intent. Every selector belongs behind `AppManager` or a helper in
`src/playwright/plugins/`, re-exported from `plugins/index.ts`.

```ts
await host.createSpace();
await host.createObject({ type: 'Document' });
await Support.walk(host.page, DOCUMENT_TOUR);
```

`AppManager` already gives you `init()` (boot + wait for the auto-created identity), `createSpace()`,
`createObject({ type })` (by typename, because the picker's label is localized),
`enablePlugin(id)`, `deck.plank(nth)`, `dragTo()`, `toastAction()`. Reach for it before writing a
locator.

## 4. Never `waitForTimeout`. Assert, don't sleep

Use auto-retrying web-first assertions and `locator.waitFor()`:

```ts
await expect(host.getObjectLinks()).toHaveCount(3); // retries until it holds or times out
await host.page.waitForTimeout(100); // never
```

A fixed sleep is either too short (flake) or too long (a suite that takes an hour), and it is
always both on someone else's machine. Where a sleep looks unavoidable, the thing you actually
need is an assertion on the state the sleep was waiting for.

### Budgets are claimed, with a reason

The config gives each test 60s and each action 30s. Where a flow genuinely needs more, call
`test.slow()` as the **first** statement, before any step has spent the budget, and say why:

```ts
test('logout', async () => {
  // Logout wipes storage and reloads; post-reset boot runs ~8-11s, which does not fit the
  // default 60s alongside setup.
  test.slow();
```

Prefer `test.slow()` to a bare per-assertion `timeout:`. When you do raise one assertion, the
number needs a justification in the comment — "~3x the observed worst case" is a reason, `30_000`
alone is not.

## 5. Fold a multi-step failure into one polled value

The pattern in `chat.spec.ts`, and the best thing in this suite. A chain of separate assertions
reports only where it stopped; a single `expect.poll` over a derived value reports _what actually
happened_:

```ts
await expect
  .poll(
    async () => {
      if (!failure && (await assistant.error.isVisible())) {
        failure = await assistant.error.innerText(); // latched: the toast auto-dismisses at 20s
      }
      if (failure) return `request failed: ${failure}`;
      const thread = await assistant.text();
      if (REPLY.test(thread)) return 'replied';
      return thread.includes(PROMPT_EXCERPT) ? 'prompt echoed, no reply' : 'prompt not echoed';
    },
    { timeout: RESPONSE_TIMEOUT },
  )
  .toBe('replied');
```

The failure message is now `'prompt echoed, no reply'` instead of a bare `Test timeout` naming
nothing. **Latch** transient evidence (a toast, a console error) the moment you see it — polling
for it live reports the post-dismissal state and loses the reason.

## 6. Assert on the model, not on the rendering, when the model is the point

Indentation is not containment. `collections.spec.ts` compares `data-object-id` values, because a
row's object id _is_ its canonical graph path:

```ts
const child = await host.getObjectByName('Collection 1').getAttribute('data-object-id');
const parent = await host.getObjectByName('Collection 2').getAttribute('data-object-id');
expect(child?.split('/').slice(0, -1).join('/')).toEqual(parent);
```

Likewise for convergence between two peers: assert that both documents hold both edits, not that
each peer sees its own. Last-writer-wins satisfies a per-peer check and is still the bug.

## 7. Drive the real UI to set up data

Prefer `createSpace()` → `createObject()` → interact, so the test exercises production code paths.
Setup that reaches around the UI tests a path no user takes.

Where a flow genuinely cannot be driven — third-party OAuth, a provider's HTTP — use a documented,
dev/e2e-gated bridge and a `page.route` mock (`plugins/inbox-http-mock.ts`). Never live
credentials, never real network to a third party.

**`DX_PWA=false` is mandatory**, and specs that depend on interception say so loudly at module
scope rather than failing mysteriously:

```ts
if (process.env.DX_PWA !== 'false') {
  throw new Error('Inbox e2e must run with DX_PWA=false');
}
```

The service worker breaks `page.route` and routing. The moon task sets it; a bare
`playwright test` does not.

## 8. There are no retries. A flake is a bug or a skip

`retries: 0`, everywhere, deliberately: retrying hides flakes behind a 3x time cost and makes shard
timings useless for sizing the suite. So a flake fails loudly, and the response is to fix it or to
skip it **with a TODO naming the cause**:

```ts
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'TODO(thure): Issue #7387: Firefox/Webkit cannot click the item actions menu, only in CI.',
);
```

A bare `test.skip(browserName !== 'chromium')` with no reason is how a suite quietly stops testing
anything. Note that skipped tests are still published to PostHog for exactly this reason — see
`DASHBOARD.md`.

When you skip a whole `describe`, write the reason as a JSDoc block above it, including what would
have to change to restore it. `inbox.spec.ts` is the model: it names the mechanism that broke it
(sync moved to EDGE, so `page.route` is never reached) and the fix (seed the mailbox instead of
syncing it).

## 9. Write for three browsers, and know which ones you are skipping

CI runs chromium, firefox and webkit as separate cells. Many tests are chromium-only; that is a
cost, not a default. Before adding `test.skip(browserName !== 'chromium')`, check whether the
failure is the app's or the harness's — `packages/common/test-utils/src/playwright.ts` already
carries webkit workarounds (OPFS needs a persistent context, x64 Linux needs `JSC_useWasmIPInt=false`).

Webkit's boot path is sensitive to chunk-graph shape: a plugin that adds broad top-level imports to
its `Plugin.ts` can shift bundler ordering and trip ESM init order. Keep module `activate` bodies
behind `Capability.lazy`.

## 10. Two-peer tests need two profiles, not two tabs

A second tab shares storage and would pass a replication test without replicating anything. Use a
second `AppManager`, and remember that workers each boot two app instances — which is why this
config runs 3 workers rather than 4.

`127.0.0.1`, never `localhost`: `localhost` resolves to `::1` first, and Firefox fails ICE outright
on a page served over IPv6 loopback, stranding every invitation.

## Running

```bash
DX_PWA=false moon run composer-e2e:e2e                    # the suite, against the production bundle
PLAYWRIGHT_BROWSER=webkit DX_PWA=false moon run composer-e2e:e2e
pnpm exec playwright test --config=src/playwright/playwright.config.ts --grep @QA-1
node scripts/check-qa-coverage.mjs                        # the .mdl binding
```

`--grep @QA-1` works because the tags are real Playwright tags — running "everything that
automates flow QA-1" needs no extra machinery.

The measurement harnesses are **not** here: `startup.spec.ts`, `perf-*.spec.ts` and `dev-*.spec.ts`
stay in `packages/apps/composer-app`, beside the budget tasks that gate on them. A number must
never gate a merge from this suite, and a behavioural assertion must never live in a benchmark.
