---
name: browser-e2e-tests
description: >-
  Authoring browser end-to-end tests for the Composer app with Playwright. Use when writing,
  editing, or reviewing *.spec.ts under packages/apps/composer-app/src/playwright, adding
  page-object helpers, or deciding how to target elements (always data-testid, never labels/roles).
---

# Browser E2E Tests (Playwright)

Browser e2e drives the real Composer app in a browser — the only tier that verifies *perceived*
behavior: interactivity during async work, no false empty states, and full click→render flows.
Distinct from `agent-e2e-tests` (the LLM agent harness) and storybook interaction tests.

Location: `packages/apps/composer-app/src/playwright/` — `*.spec.ts` specs, root page-objects
(`app-manager.ts`), and per-plugin helpers under `plugins/` (re-exported from `plugins/index.ts`).

## Golden rule: target by `data-testid`, never by label, text, or role-name

Labels and visible text come from `translations.ts` and change with copy/i18n; role-names are
ambiguous when several controls share a name. **`data-testid` is the only stable selector.**

- Do: `page.getByTestId('inbox.message.reply')`.
- Don't: `getByRole('button', { name: 'Reply' })`, `getByText('Send')`, `getByLabelText('To')`.
- **If the element has no testid, add one to the component as part of writing the test.** A missing
  testid is a source gap to fix, not a reason to fall back to a label. Never let a translated string
  become a selector.

### How to add testids

- **Plain elements / primitives:** pass `data-testid`. Many `@dxos/react-ui` primitives and
  `Form.Root` / `Form.Submit` forward it (e.g. `Form.Submit` renders `data-testid='save-button'`).
- **Menu & toolbar actions (`@dxos/react-ui-menu`):** the toolbar emits `data-testid` **only** when
  the action sets `action.properties.testId` — a `label`/`icon` alone produces no testid. Add
  `properties: { testId: 'inbox.message.reply' }` to the action spec; do not target the menu label.
- **Naming:** dot-namespaced `plugin.area.element`, matching existing ids (`spacePlugin.object`,
  `deck.plank`, `create-object-form`). E.g. `inbox.mailbox.row`, `inbox.message.header`,
  `inbox.draft.send`.

## Selector priority (only when a testid genuinely can't exist yet)

1. `data-testid` — the default; add it if missing.
2. Framework/ARIA *state* that encodes behavior, not copy: `aria-selected`, `aria-current`, ids/
   classes the framework sets (e.g. a Mosaic tile's `id`, `dx-current`/`dx-selected`).
3. Role — only scoped inside a testid'd container, never role + translated name as the primary hook.

Visible text/labels are for **assertions about content**, never for **locating controls**.

## Spec structure

Follow the existing shape (`basic.spec.ts`):

```ts
import { expect, test } from '@playwright/test';
import { AppManager } from './app-manager';

// The PWA service worker breaks routing/interception; require it disabled.
if (process.env.DX_PWA !== 'false') { throw new Error('run with DX_PWA=false'); }

test.describe('Inbox', () => {
  let host: AppManager;
  test.beforeEach(async ({ browser }) => { host = new AppManager(browser, false); await host.init(); });
  test.afterEach(async () => { await host.closePage(); });

  test('selecting a thread opens the companion', async () => {
    // Drive via page objects + testids — no inline selectors, no labels.
  });
});
```

## Page objects

Every interaction lives behind a page-object so specs read as intent, not selectors.

- Reuse `AppManager`: `init()` (boots, waits for the auto-created identity), `createSpace()`,
  `createObject({ type: '<Typename label>' })` (picks the type by its typename label, e.g.
  `'Mailbox'`), `enablePlugin('org.dxos.plugin.<x>')` (via the `/!dxos:plugin-registry` route),
  `deck.plank(nth)`.
- Add a per-plugin helper under `plugins/` (e.g. `plugins/inbox.ts` exporting an `Inbox`
  page-object) and re-export from `plugins/index.ts`. Keep all selectors inside the helper.

## Running

- `DX_PWA=false moon run composer-app:e2e` — config `src/playwright/playwright.config.ts`
  (`e2ePreset`, `vite preview` on port 4173, pre-built bundle).
- `PLAYWRIGHT_BROWSER=chromium|firefox|webkit|all` selects projects; many tests are chromium-only
  via `test.skip(browserName !== 'chromium')`.
- CI: the `Check` `e2e` job runs only on main/release or `workflow_dispatch e2e=true`.

## Waiting & stability

- No `page.waitForTimeout` / `sleep`. Use auto-retrying web-first assertions
  (`await expect(locator).toBeVisible()`), `locator.waitFor()`, and assert on framework state
  (`aria-selected`) rather than screenshots or copy where behavior is the thing under test.

## Data setup

- Prefer driving the real UI (`createSpace` → `createObject` → interact) so the test exercises
  production code paths.
- When a flow can't be driven from the UI (e.g. OAuth login), use a documented, dev/e2e-gated test
  bridge — never live credentials, never real network to third parties. Mock external HTTP.

## Anti-patterns

| Don't | Do |
|---|---|
| `getByRole('button', { name: 'Reply' })` | add `properties.testId` → `getByTestId('inbox.message.reply')` |
| `getByText('Send')` / `getByLabelText('To')` | testid on the field/control |
| Fall back to a label when the testid is missing | add the testid to the component |
| `page.waitForTimeout(1000)` | `expect(locator).toBeVisible()` / `waitFor()` |
| Inline selectors scattered across a spec | a page-object helper under `plugins/` |
| Live provider credentials / real third-party network | mock + a gated test bridge; `DX_PWA=false` |

> An earlier Stagehand (AI-driven act/extract) experiment is **not** the convention and is not
> currently landed. Author plain Playwright with testid-scoped page objects.
