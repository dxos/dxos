# Composer Appearance Setting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-device `appearance: light | dark | system` setting (default `system`) to plugin-theme that overrides the OS `prefers-color-scheme`, applied live across all tabs in the same browser.

**Architecture:** plugin-theme gains a KVS-backed (localStorage) settings atom contributed as `AppCapabilities.Settings` (rendered by plugin-settings' generic `DefaultSettings` form) and a plugin-local `ThemeCapabilities.Settings` key. `react-context.tsx` reads that atom and recomputes the effective theme (the `dark` class + `themeAtom`) from three sources: the `matchMedia` change event, the in-tab atom subscription, and a cross-tab `window` `storage` event.

**Tech Stack:** TypeScript, Effect Schema, `@effect-atom/atom-react`, `@dxos/app-framework` capabilities, `@dxos/effect` (`createKvsStore`), vitest + jsdom.

## Global Constraints

- Scope is `packages/plugins/plugin-theme` only — no edits outside it (out-of-scope edits require explicit approval per CLAUDE.md).
- No casts to silence types (`as any` / `as unknown as` / non-null `!`); `as const` is allowed.
- Named exports; prefer `#private`; single quotes; comments end with a period and state _why_.
- Workspace deps use `workspace:*`.
- Commit scope prefix: `plugin-theme:`.
- Copyright header `// Copyright 2026 DXOS.org //` on new files.
- `@import-as-namespace` type files: PascalCase filename matching the namespace; consumed via the `types` barrel (`export * as Foo from './Foo'`).
- Test after every task; never claim done without showing the command output.

---

### Task 1: Settings schema, capability, and wiring

Adds the setting so it exists, persists, and appears in the Settings dialog. No theme-application behavior yet (Task 2).

**Files:**

- Create: `packages/plugins/plugin-theme/src/types/Settings.ts`
- Create: `packages/plugins/plugin-theme/src/types/ThemeCapabilities.ts`
- Create: `packages/plugins/plugin-theme/src/types/index.ts`
- Create: `packages/plugins/plugin-theme/src/settings.ts`
- Modify: `packages/plugins/plugin-theme/src/ThemePlugin.ts`
- Modify: `packages/plugins/plugin-theme/package.json` (add `@dxos/effect` dep)
- Modify: `packages/plugins/plugin-theme/tsconfig.json` (add `@dxos/effect` reference)
- Test: `packages/plugins/plugin-theme/src/ThemePlugin.test.ts`

**Interfaces:**

- Produces:
  - `Settings.Appearance` = `'light' | 'dark' | 'system'` (Effect Schema union).
  - `Settings.Settings` = `{ appearance?: Appearance }` (mutable struct).
  - `ThemeCapabilities.Settings` = `Capability<Atom.Writable<Settings.Settings>>`.
  - A capability module (default export of `src/settings.ts`) contributing both `ThemeCapabilities.Settings` and `AppCapabilities.Settings { prefix, schema, atom }`.
  - A plugin module (activates on `SetupSettings`) that activates the settings capability.

- [ ] **Step 1: Create the settings schema**

`packages/plugins/plugin-theme/src/types/Settings.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Appearance = Schema.Union(
  Schema.Literal('light').annotations({ title: 'Light' }),
  Schema.Literal('dark').annotations({ title: 'Dark' }),
  Schema.Literal('system').annotations({ title: 'System' }),
);
export type Appearance = Schema.Schema.Type<typeof Appearance>;

/**
 * Theme plugin settings.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    appearance: Schema.optional(
      Appearance.annotations({
        title: 'Appearance',
        description: 'Force light or dark mode, or follow the system setting.',
      }),
    ),
  }),
);
export interface Settings extends Schema.Schema.Type<typeof Settings> {}
```

- [ ] **Step 2: Create the capability key**

`packages/plugins/plugin-theme/src/types/ThemeCapabilities.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(
  `${meta.profile.key}.capability.settings`,
);
```

- [ ] **Step 3: Create the types barrel**

`packages/plugins/plugin-theme/src/types/index.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

export * as Settings from './Settings';
export * as ThemeCapabilities from './ThemeCapabilities';
```

- [ ] **Step 4: Create the settings capability module**

`packages/plugins/plugin-theme/src/settings.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { createKvsStore } from '@dxos/effect';

import { Settings, ThemeCapabilities } from './types';

import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = createKvsStore({
      key: meta.profile.key,
      schema: Settings.Settings,
      defaultValue: () => ({ appearance: 'system' as const }),
    });

    return [
      Capability.contributes(ThemeCapabilities.Settings, settingsAtom),
      Capability.contributes(AppCapabilities.Settings, {
        prefix: meta.profile.key,
        schema: Settings.Settings,
        atom: settingsAtom,
      }),
    ];
  }),
);
```

- [ ] **Step 5: Add `@dxos/effect` dependency**

In `packages/plugins/plugin-theme/package.json`, add to `dependencies` (keep alphabetical order — after `@dxos/echo`):

```json
    "@dxos/effect": "workspace:*",
```

In `packages/plugins/plugin-theme/tsconfig.json`, add to `references` (after the `core/echo/echo` entry, keeping the existing order roughly grouped):

```json
    {
      "path": "../../common/effect"
    },
```

Then run: `HUSKY=0 pnpm install --no-frozen-lockfile`
Expected: completes; `packages/plugins/plugin-theme/node_modules/@dxos/effect` symlink exists.

- [ ] **Step 6: Wire the settings module into the plugin**

Modify `packages/plugins/plugin-theme/src/ThemePlugin.ts`. Add a lazy capability and a module, and add `SetupSettings` to `ReactContext.firesBeforeActivation` (so the settings atom exists when `ReactContext` activates in Task 2). Full file after edit:

```ts
//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

import { type ThemePluginOptions } from './react-context';

const ReactContext = Capability.lazy('ReactContext', () => import('./react-context'));
const Translator = Capability.lazy('Translator', () => import('./translator'));
const Settings = Capability.lazy('Settings', () => import('./settings'));

export const ThemePlugin = Plugin.define<ThemePluginOptions>(meta).pipe(
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(ReactContext),
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [AppActivationEvents.SetupTranslations, AppActivationEvents.SetupSettings],
    activate: () => ReactContext(options),
  })),
  Plugin.addModule((options: ThemePluginOptions) => ({
    id: Capability.getModuleTag(Translator),
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [AppActivationEvents.SetupTranslations],
    activate: () => Translator(options),
  })),
  Plugin.addModule({
    id: Capability.getModuleTag(Settings),
    activatesOn: AppActivationEvents.SetupSettings,
    activate: Settings,
  }),
  Plugin.make,
);

export default ThemePlugin;
```

- [ ] **Step 7: Write a test that the setting is contributed**

Append to `packages/plugins/plugin-theme/src/ThemePlugin.test.ts` a new test inside the `describe('ThemePlugin', …)` block. First add imports at the top of the file (after the existing `@dxos/app-toolkit` import):

```ts
import { Capabilities } from '@dxos/app-framework';

import { ThemeCapabilities } from './types';
```

Then the test:

```ts
test('contributes an appearance setting', async ({ expect }) => {
  await using harness = await createTestApp({
    plugins: [ProcessManagerPlugin(), ThemePlugin({})],
  });

  // The plugin-local capability resolves to a writable settings atom.
  const registry = harness.get(Capabilities.AtomRegistry);
  const settingsAtom = harness.get(ThemeCapabilities.Settings);
  expect(registry.get(settingsAtom).appearance).toBe('system');

  // It is also exposed to the generic settings UI keyed by the plugin.
  const allSettings = harness.capabilities.getAll(AppCapabilities.Settings);
  expect(allSettings.some((entry) => entry.prefix === meta.profile.key)).toBe(true);
});
```

- [ ] **Step 8: Run the new test**

Run: `moon run plugin-theme:test -- src/ThemePlugin.test.ts -t "contributes an appearance setting"`
Expected: PASS.

If `harness.capabilities.getAll` is not the accessor, discover the correct one: the existing test uses `harness.get(AppCapabilities.Translator)` (single) and `harness.capabilities` (for `Effect.provideService`). Use `harness.get(AppCapabilities.Settings)` if it returns the array of contributions, or inspect `harness.capabilities` for a `getAll` method; adjust the assertion to whichever returns the contributed array.

- [ ] **Step 9: Build and lint**

Run: `moon run plugin-theme:build`
Expected: success (produces dist).

Run: `moon run plugin-theme:lint -- --fix`
Expected: no errors. Note: lint may rewrite named imports of `@import-as-namespace` files — accept its rewrites.

- [ ] **Step 10: Commit**

```bash
git add packages/plugins/plugin-theme pnpm-lock.yaml
git commit -m "plugin-theme: add appearance settings schema and capability"
```

---

### Task 2: Honor the setting in react-context

Makes the theme actually follow the setting, overriding the OS preference, with live updates in-tab and cross-tab. TDD.

**Files:**

- Modify: `packages/plugins/plugin-theme/src/react-context.tsx`
- Test: `packages/plugins/plugin-theme/src/ThemePlugin.test.ts`

**Interfaces:**

- Consumes: `ThemeCapabilities.Settings` (Task 1) — `Atom.Writable<Settings.Settings>`; `Settings.Appearance` (Task 1).
- Produces: no new exports; observable behavior is the `dark` class on `document.documentElement` and the `themeAtom` `themeMode`.

- [ ] **Step 1: Write the failing behavior tests**

Add to `packages/plugins/plugin-theme/src/ThemePlugin.test.ts`. First extend `beforeEach` (below the existing `matchMedia` stub) to isolate DOM/storage state between tests:

```ts
localStorage.clear();
document.documentElement.classList.remove('dark');
```

Add a helper for a matchMedia stub with a given `matches` value, replacing the inline stub so tests can vary the system preference. Replace the `beforeEach` body's `value: vi.fn()...` with a module-level helper and call it:

```ts
const stubMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};
```

`beforeEach`:

```ts
beforeEach(() => {
  stubMatchMedia(false); // System preference = light by default.
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});
```

Then the tests:

```ts
test('appearance override forces dark independent of system preference', async ({ expect }) => {
  // System preference is light (stubMatchMedia(false)).
  await using harness = await createTestApp({
    plugins: [ProcessManagerPlugin(), ThemePlugin({})],
  });
  const registry = harness.get(Capabilities.AtomRegistry);
  const settingsAtom = harness.get(ThemeCapabilities.Settings);

  registry.set(settingsAtom, { appearance: 'dark' });
  await Promise.resolve();
  expect(document.documentElement.classList.contains('dark')).toBe(true);

  registry.set(settingsAtom, { appearance: 'light' });
  await Promise.resolve();
  expect(document.documentElement.classList.contains('dark')).toBe(false);

  registry.set(settingsAtom, { appearance: 'system' });
  await Promise.resolve();
  expect(document.documentElement.classList.contains('dark')).toBe(false); // Follows light system.
});

test("appearance 'system' follows the OS preference", async ({ expect }) => {
  stubMatchMedia(true); // System preference = dark.
  await using harness = await createTestApp({
    plugins: [ProcessManagerPlugin(), ThemePlugin({})],
  });
  // Default appearance is 'system'; with a dark system preference the class is set.
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});

test('cross-tab storage event re-applies the theme', async ({ expect }) => {
  // System preference is light; another tab writes 'dark'.
  await using harness = await createTestApp({
    plugins: [ProcessManagerPlugin(), ThemePlugin({})],
  });
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: meta.profile.key,
      newValue: JSON.stringify({ appearance: 'dark' }),
    }),
  );
  expect(document.documentElement.classList.contains('dark')).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `moon run plugin-theme:test -- src/ThemePlugin.test.ts`
Expected: the three new tests FAIL (current `react-context` ignores the setting — `appearance: 'dark'` under a light system leaves the class unset). The `'system'` test may pass coincidentally; the override and storage tests must fail.

- [ ] **Step 3: Implement the override in react-context**

Rewrite `packages/plugins/plugin-theme/src/react-context.tsx` to the following:

```tsx
//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React, { ReactNode } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { type ThemeMode, ThemeProvider, type ThemeProviderProps, Toast, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui';

import { Settings, ThemeCapabilities } from './types';

import { meta } from './meta';

export type ThemePluginOptions = Partial<Pick<ThemeProviderProps, 'tx' | 'noCache' | 'resourceExtensions'>> & {
  appName?: string;
  platform?: 'mobile' | 'desktop';
};

// Parse the appearance from a cross-tab `storage` event value; `Atom.kvs` stores
// the settings object as a single JSON string. Fall back to 'system' on any
// malformed value.
const parseAppearance = (value: string | null): Settings.Appearance => {
  if (!value) {
    return 'system';
  }
  try {
    const appearance = (JSON.parse(value) as Settings.Settings)?.appearance;
    return appearance === 'light' || appearance === 'dark' ? appearance : 'system';
  } catch {
    return 'system';
  }
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ tx: propsTx = defaultTx, noCache, platform }: ThemePluginOptions = {}) {
    const registry: Registry.Registry = yield* Capability.get(Capabilities.AtomRegistry);
    const settingsAtom = yield* Capability.get(ThemeCapabilities.Settings);
    const themeAtom = Atom.make<{ themeMode: ThemeMode }>({ themeMode: 'dark' }).pipe(Atom.keepAlive);

    const modeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // 'system' follows the OS; 'light'/'dark' override it.
    const applyTheme = (appearance: Settings.Appearance) => {
      const dark = appearance === 'system' ? modeQuery.matches : appearance === 'dark';
      document.documentElement.classList[dark ? 'add' : 'remove']('dark');
      registry.set(themeAtom, { themeMode: dark ? 'dark' : 'light' });
    };

    const currentAppearance = (): Settings.Appearance => registry.get(settingsAtom).appearance ?? 'system';

    // Apply the persisted setting synchronously to avoid a flash on load.
    applyTheme(currentAppearance());

    // System preference changes (observed while appearance is 'system').
    const handleModeChange = () => applyTheme(currentAppearance());
    modeQuery.addEventListener('change', handleModeChange);

    // In-tab setting changes.
    const unsubscribe = registry.subscribe(settingsAtom, (settings) => applyTheme(settings.appearance ?? 'system'));

    // Cross-tab setting changes: `Atom.kvs` does not observe the `storage` event,
    // so re-apply from the written value to keep every tab in the same browser in sync.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== meta.profile.key) {
        return;
      }
      applyTheme(parseAppearance(event.newValue));
    };
    window.addEventListener('storage', handleStorage);

    return Capability.contributes(
      Capabilities.ReactContext,
      {
        id: meta.profile.key,
        context: ({ children }: { children?: ReactNode }) => {
          const { themeMode } = useAtomValue(themeAtom);
          // Translations are registered in the shared i18next instance by the Translator module; the
          // theme provider only exposes that instance to React.
          return (
            <ThemeProvider {...{ tx: propsTx, themeMode, platform, noCache }}>
              <Toast.Provider>
                <Tooltip.Provider delayDuration={1_000} skipDelayDuration={100} disableHoverableContent>
                  {children}
                </Tooltip.Provider>
                <Toast.Viewport />
              </Toast.Provider>
            </ThemeProvider>
          );
        },
      },
      () =>
        Effect.sync(() => {
          modeQuery.removeEventListener('change', handleModeChange);
          window.removeEventListener('storage', handleStorage);
          unsubscribe();
        }),
    );
  }),
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `moon run plugin-theme:test -- src/ThemePlugin.test.ts`
Expected: all tests PASS.

If the override test fails only on timing (class not yet updated after `registry.set`), the `await Promise.resolve()` may be insufficient — replace with `await new Promise((resolve) => setTimeout(resolve, 0))`. Do not remove the assertion; fix the wait.

- [ ] **Step 5: Build and lint**

Run: `moon run plugin-theme:build`
Expected: success.

Run: `moon run plugin-theme:lint -- --fix`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/plugin-theme
git commit -m "plugin-theme: honor appearance setting over system preference"
```

---

### Task 3: Changeset and final verification

**Files:**

- Create: `.changeset/theme-appearance-setting.md`

**Interfaces:** none.

- [ ] **Step 1: Write the changeset**

`.changeset/theme-appearance-setting.md`:

```md
---
'@dxos/plugin-theme': minor
---

Add an appearance setting (Light / Dark / System, default System) that overrides the OS colour-scheme preference. Persisted per-device and applied live across all tabs in the same browser.
```

- [ ] **Step 2: Full package verification**

Run: `moon run plugin-theme:test`
Expected: all tests PASS.

Run: `moon run plugin-theme:build`
Expected: success.

Run: `moon run plugin-theme:lint`
Expected: no errors.

Run: `pnpm format`
Expected: no changes needed (or accept oxfmt's formatting).

- [ ] **Step 3: No-cast audit**

Run: `git diff --staged | grep -nE 'as any|as unknown as|as [A-Z]|!\.' || echo "clean"`
Expected: `clean` (or only legitimate `as const`). Fix any type shortcut at its source.

- [ ] **Step 4: Commit**

```bash
git add .changeset/theme-appearance-setting.md
git commit -m "plugin-theme: changeset for appearance setting"
```

- [ ] **Step 5: Manual verification in the app**

Start the app: preview_start `{ name: 'composer-app' }` (or the launch config), open Settings → Theme.

- Set macOS to Light. Choose **Dark** in the setting → app renders dark. Screenshot.
- Reload → choice persists (still dark). Screenshot.
- Switch to **System** → app follows the OS (light). Screenshot.
- (Optional) Open a second tab → changing the setting in one flips both tabs live.

Report screenshots to the user (remote — attach visuals).

---

## Self-Review

**Spec coverage:**

- Setting schema `light|dark|system` default `system` → Task 1 Steps 1, 4. ✓
- Persistence (localStorage/KVS, per-device) → Task 1 Step 4 (`createKvsStore`). ✓
- Honor setting in react-context (system→matchMedia; light/dark→override, stay subscribed) → Task 2 Step 3. ✓
- Cross-tab live via `storage` bridge → Task 2 Step 3 (`handleStorage`) + test Step 1. ✓
- Settings UI (generic `DefaultSettings`) → Task 1 Step 4 (`AppCapabilities.Settings` contribution); no custom UI. ✓
- Activation ordering → Task 1 Step 6 (`firesBeforeActivation: [SetupTranslations, SetupSettings]`). ✓
- Tests (override, system, storage, contribution) → Task 1 Step 7, Task 2 Step 1. ✓
- Changeset → Task 3 Step 1. ✓
- Manual verification → Task 3 Step 5. ✓

**Placeholder scan:** none — every code step contains full content.

**Type consistency:** `Settings.Appearance` / `Settings.Settings` / `ThemeCapabilities.Settings` used identically across Tasks 1–2; `applyTheme(appearance: Settings.Appearance)` and `currentAppearance(): Settings.Appearance` agree; `parseAppearance` returns `Settings.Appearance`.
