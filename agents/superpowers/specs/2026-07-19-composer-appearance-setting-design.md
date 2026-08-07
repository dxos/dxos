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
plugin-local capability and `AppCapabilities.Settings`. This keeps the setting
inside plugin-theme (the plugin that already owns the theme), consistent with
every other plugin's settings, and the generic `DefaultSettings` surface renders
the form.

### Persistence & propagation

Scope: **per-device, live across all tabs of the same browser.** Not synced to
other devices (an explicit decision — matches every other plugin's settings; a
cross-device design would need an ECHO/HALO-backed store instead).

`createKvsStore` (`@dxos/effect`) is backed by `BrowserKeyValueStore.layerLocalStorage`
— the whole settings object is a single JSON `localStorage` key, so per-device
persistence is inherent.

`Atom.kvs` does **not** listen for the cross-tab `storage` event
([Atom.js:962](../../../node_modules/@effect-atom/atom/dist/esm/Atom.js)), so a
second tab would otherwise only pick up a change on reload. To make the theme
switch live in every tab, `react-context` adds a `window` `storage`-event
listener keyed on `meta.profile.key`: on a cross-tab write it parses
`event.newValue` and re-applies the effective theme (the `dark` class +
`themeAtom`). It does **not** write back to the settings atom — that would risk a
cross-tab write loop — so a second tab's open settings _form_ still reflects the
new value only on reload, while the _theme itself_ updates instantly everywhere.
That caveat is acceptable: the visible theme is what must stay in sync.

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
no-flash-on-load behavior. Three sources feed the same `applyTheme(appearance)`
recompute, all torn down in the module's cleanup callback:

1. `matchMedia` `change` listener — recompute with the current atom value.
2. `registry.subscribe(settingsAtom, …)` — in-tab setting changes.
3. `window` `storage` listener (see Persistence & propagation) — cross-tab.

### Activation ordering

`ReactContext` activates on `Startup` and already declares
`firesBeforeActivation: [SetupTranslations]`. Add `SetupSettings` to that list so
the theme's own settings module (which activates on `SetupSettings` and creates
the atom) has run before `ReactContext` resolves `ThemeCapabilities.Settings`.
The settings module only calls `createKvsStore` (localStorage) — no dependency
back on the theme context, so no cycle.

### Settings UI — none needed (generic renderer)

plugin-settings contributes a generic
[`DefaultSettings`](../../../packages/plugins/plugin-settings/src/containers/DefaultSettings/DefaultSettings.tsx)
surface (`position: Position.last`, filter `AppSurface.settings(AppSurface.Article)`)
that renders a schema-driven `Form` for **any** plugin's contributed
`AppCapabilities.Settings { prefix, schema, atom }`. plugin-theme therefore needs
**no settings container and no settings surface** — contributing the schema + atom
is enough; the `Appearance` union renders as a select (Light / Dark / System)
under a "Theme" section in the Settings dialog. This drops the `ThemeSettings`
container, the theme `react-surface`, and the `@dxos/react-ui-form` dependency
from an earlier draft of this plan.

## Files

New (in `packages/plugins/plugin-theme`):

- `src/types/Settings.ts` — `@import-as-namespace` schema.
- `src/types/ThemeCapabilities.ts` — `Settings` capability key (writable atom).
- `src/types/index.ts` — namespace barrel.
- `src/capabilities/settings.ts` — KVS store + `ThemeCapabilities.Settings` +
  `AppCapabilities.Settings` contributions.
- `src/capabilities/index.ts` — lazy barrel.

Edited:

- `src/react-context.tsx` — honor the setting; add matchMedia + atom + storage
  recompute sources.
- `src/ThemePlugin.ts` — add the settings module (`SetupSettings`); extend
  `ReactContext.firesBeforeActivation` with `SetupSettings`.
- `package.json` — `#types` / `#capabilities` import aliases (no new deps).
- `vite.config.ts` — unchanged (internal barrels bundle into `ThemePlugin`).
- `src/ThemePlugin.test.ts` — override-logic coverage.
- `.changeset/*.md` — `@dxos/plugin-theme` minor.

No settings container, settings surface, `#containers` alias, or
`@dxos/react-ui-form` dependency — the generic `DefaultSettings` renders the form.

## Testing

Extend `ThemePlugin.test.ts` (already stubs `matchMedia`). Assertions:

- `appearance: 'dark'` + `matchMedia matches:false` → `documentElement` has the
  `dark` class and `themeAtom.themeMode === 'dark'`.
- `appearance: 'light'` + `matchMedia matches:true` → no `dark` class,
  `themeMode === 'light'`.
- `appearance: 'system'` → follows `matchMedia` (both matches:true/false).
- Changing the setting after activation re-applies live (in-tab subscribe path).
- A dispatched `window` `storage` event for the theme key re-applies the theme
  (cross-tab path).

Manual verification (per task): set macOS Light, choose Dark in the setting →
app renders dark; reload → choice persists; switch to System → follows OS.

## Deliberate scope calls

- **No custom settings UI / storybook** — the generic `DefaultSettings` renders
  the form, so plugin-theme adds no container or story.
- **No new translation strings** — field/option labels come from schema
  annotations, matching plugin-deck.
- **Per-device only** — no cross-device sync (would require an ECHO/HALO store).

## Out of scope

- No changes to `@dxos/react-ui` `ThemeMode`, `@dxos/ui-theme`, or any shared
  primitive.
- No cross-plugin `./types` export subpath — nothing else consumes the theme
  settings key.
