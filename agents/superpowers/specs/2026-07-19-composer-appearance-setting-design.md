# Composer appearance setting — design

**Date:** 2026-07-19
**Scope:** `packages/plugins/plugin-theme` only.
**Status:** Approved (pending written-spec review).

## Problem

Composer's theme is hardwired to follow the OS `prefers-color-scheme`, with no
way to force light or dark independent of the system setting.

- [`react-context.tsx:23`](../../../packages/plugins/plugin-theme/src/react-context.tsx#L23)
  seeds `themeAtom = { themeMode: 'dark' }`.
- [`react-context.tsx:30-32`](../../../packages/plugins/plugin-theme/src/react-context.tsx#L30)
  drives the `dark` class + `themeAtom` entirely from
  `window.matchMedia('(prefers-color-scheme: dark)')` and its `change` event.
- plugin-theme has no settings schema, no settings UI, and no `types` /
  `capabilities` / `containers` directories today — it contributes only
  `ReactContext` and `Translator`.

## Goal

A per-device `appearance: 'light' | 'dark' | 'system'` setting, default
`'system'`, that overrides the OS preference. Persisted like other UI state.

## Approach

Mirror the settings pattern used by plugin-deck / plugin-registry / plugin-markdown:
each plugin owns its settings via a KVS-backed atom contributed as both a
plugin-local capability and `AppCapabilities.Settings`, with a `Form`-based
settings surface. This keeps the setting inside plugin-theme (the plugin that
already owns the theme), consistent with every other plugin's settings.

### Persistence

`createKvsStore` (`@dxos/effect`) is backed by `BrowserKeyValueStore.layerLocalStorage`
— the whole settings object is a single JSON `localStorage` key. Per-device
persistence is therefore inherent; no extra work.

### Settings schema (`src/types/Settings.ts`)

```ts
export const Appearance = Schema.Union(
  Schema.Literal('light').annotations({ title: 'Light' }),
  Schema.Literal('dark').annotations({ title: 'Dark' }),
  Schema.Literal('system').annotations({ title: 'System' }),
);

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
```

`react-ui-form` renders a `Schema.Union` of literals as a **select**
(`FormField.tsx` → `SchemaEx.isLiteralUnion` → `SelectField`), with option
labels taken from each literal's `title` annotation. No new i18n strings are
required — labels live in the schema, exactly as plugin-deck does.

Default is `'system'` (the `defaultValue()` in the KVS store sets
`appearance: 'system'`).

### Honoring the setting (`src/react-context.tsx`)

The activation body reads the settings atom and recomputes the effective theme
whenever **either** the media query **or** the setting changes:

```
effective = appearance === 'system'
  ? (matchMedia matches ? 'dark' : 'light')
  : appearance
```

- `'system'` → keeps the current `matchMedia` behavior and listener.
- `'light'` / `'dark'` → sets the `dark` class + `themeAtom` from the setting,
  ignoring the media-query result but staying subscribed so switching back to
  `'system'` immediately re-follows the OS.

The initial class is applied synchronously at activation from the persisted
setting (read via `registry.get(settingsAtom)`), preserving the current
no-flash-on-load behavior. Both the `matchMedia` `change` listener and a
`registry.subscribe(settingsAtom, …)` subscription call the same recompute; both
are torn down in the module's cleanup callback.

### Activation ordering

`ReactContext` activates on `Startup` and already declares
`firesBeforeActivation: [SetupTranslations]`. Add `SetupSettings` to that list so
the theme's own settings module (which activates on `SetupSettings` and creates
the atom) has run before `ReactContext` resolves `ThemeCapabilities.Settings`.
The settings module only calls `createKvsStore` (localStorage) — no dependency
back on the theme context, so no cycle.

### Settings UI (`src/containers/ThemeSettings`)

A `Form`-based container copied from
[`DeckSettings.tsx`](../../../packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx):
`Form.Root variant='settings'` over the schema, rendered by an
`AppSurface.settings(AppSurface.Article, meta.profile.key)` surface via
`useSettingsState`.

## Files

New (in `packages/plugins/plugin-theme`):
- `src/types/Settings.ts` — `@import-as-namespace` schema.
- `src/types/ThemeCapabilities.ts` — `Settings` capability key (writable atom).
- `src/types/index.ts` — namespace barrel.
- `src/capabilities/settings.ts` — KVS store + two contributions.
- `src/capabilities/react-surface.tsx` — settings surface.
- `src/capabilities/index.ts` — lazy barrel.
- `src/containers/ThemeSettings/{ThemeSettings.tsx,index.ts}`, `src/containers/index.ts`.

Edited:
- `src/react-context.tsx` — honor the setting.
- `src/ThemePlugin.ts` — add settings + surface modules; extend
  `ReactContext.firesBeforeActivation`.
- `package.json` — `#types` / `#capabilities` / `#containers` import aliases;
  add `@dxos/react-ui-form` dependency.
- `vite.config.ts` — unchanged (internal barrels bundle into `ThemePlugin`).
- `src/ThemePlugin.test.ts` — override-logic coverage.
- `.changeset/*.md` — `@dxos/plugin-theme` minor.

## Testing

Extend `ThemePlugin.test.ts` (already stubs `matchMedia`). Assertions:
- `appearance: 'dark'` + `matchMedia matches:false` → `documentElement` has the
  `dark` class and `themeAtom.themeMode === 'dark'`.
- `appearance: 'light'` + `matchMedia matches:true` → no `dark` class,
  `themeMode === 'light'`.
- `appearance: 'system'` → follows `matchMedia` (both matches:true/false).

Manual verification (per task): set macOS Light, choose Dark in the setting →
app renders dark; reload → choice persists; switch to System → follows OS.

## Deliberate scope calls

- **No storybook** for `ThemeSettings`. plugin-theme has no storybook infra
  today (no `storybook` moon tag, no `.storybook/`); adding it to a lean system
  plugin is scope creep. The container is a thin `Form` copy of `DeckSettings`,
  which is storybook-covered.
- **No new translation strings** — field/option labels come from schema
  annotations, matching plugin-deck.

## Out of scope

- No changes to `@dxos/react-ui` `ThemeMode`, `@dxos/ui-theme`, or any shared
  primitive.
- No cross-plugin `./types` export subpath — nothing else consumes the theme
  settings key.
