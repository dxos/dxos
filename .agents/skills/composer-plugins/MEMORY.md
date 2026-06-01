# Composer Plugins — Session Memory

Session-logged rules for agents. Append a dated section per session (newest first): `## YYYY-MM-DD — <plugin(s)>` + terse bullets. One rule per bullet; name the file/symbol/idiom. Promote durable rules into `SKILL.md`.

---

## 2026-05-31 — plugin-map, plugin-trip, react-ui-geo, schema (marker providers)

### Cross-plugin capability extension

- To let one plugin plot another's objects, define a capability that is `{ match(subject): boolean; useMarkers/use…(subject, opts) }` — `match` is a sync, hook-free type predicate; the reactive part is a hook. Contribute many; consumers pick the first whose `match` passes.
- Calling a capability-contributed HOOK conditionally breaks rules-of-hooks. Resolve the provider in the parent (`useCapabilities(...).find(match)`), then render an inner component keyed by `provider.id` that calls `provider.useX(...)` UNCONDITIONALLY. Switching providers remounts via the key.
- Keep plugin-context hooks (`useCapabilities`/`useOperationInvoker`/`useAtomCapability`) in the SURFACE component; resolve provider/url/callbacks there and pass them as props to the container. The container then needs only a `ClientProvider` in storybook (pass the provider as a prop), not a full `withPluginManager`.

### `Capability.lazy` cross-package

- `Capability.lazy('X', () => import('./x'))` whose module contributes a type declared in ANOTHER package fails `tsc` with TS2883 ("inferred type cannot be named… not portable"). Fix: eager re-export `export { default as X } from './x';` (like `BlueprintDefinition`) instead of lazy. The `<T>` param of `lazy` is the module PROPS, not the contributed value — don't annotate with the value type.

### Companion surfaces

- A companion surface created with a raw type-guard `filter` MUST also set `role: 'article'` (the `AppSurface.object(...)` helper supplies role bindings; a bare predicate does not → build error "Property 'role' is missing").
- Gate "offer companion only when X" in the app-graph-builder CONNECTOR (capability-aware: `yield* Capability.getAll(Cap)` inside `Effect.gen`), not the surface filter (filters are sync and can't read capabilities). Companion node `data: 'sentinel'`; surface filter matches `data.subject === 'sentinel' && Obj.isObject(data.companionTo)`; render with subject = `companionTo`.

### Attention selection

- `LayoutOperation.Select` `subject` is a discriminated union: single → `{ mode: 'single', id }`, multi → `{ mode: 'multi', ids: [...] }`. Branch on mode; a generic `{ mode, id }` won't typecheck. `useSelected(id,'single')` returns `string|undefined`; `'multi'` returns `string[]`.

### Toolchain

- Use `~/.proto/shims/moon` (proto resolves the repo-pinned moon 2.2.6); a stale `~/.proto/tools/moon/1.41.2` may sit earlier on PATH and rejects `.moon/workspace.yml` (`unknown field 'remote'`). Adding a workspace dep needs `HUSKY=0 CI=true pnpm install --no-frozen-lockfile`.

## 2026-05-31 — plugin-settings, plugin-trip, plugin-duffel, plugin-crx, plugin-meeting, app-toolkit

### Settings

- Plain schema-driven settings need NO per-plugin surface. The generic surface in `plugin-settings/src/capabilities/react-surface.tsx` renders `SettingsForm.FieldSet` (`@dxos/react-ui-form`) from any `AppCapabilities.Settings` subject (`{ prefix, schema, atom }`). Only add a plugin-specific settings surface for custom field rendering (e.g. assistant `fieldMap`).
- `AppSurface.settings(token, prefix?)` — `prefix` optional; omit = match any settings subject.
- Override mechanism: settings article dispatches `limit={1}`, sorted by `byPosition` (`'first' < undefined < 'last'`). Register generic fallback `position: 'last'`; plugin-specific (default position) wins.
- Generic surface renders no `Settings.Section` title (plank heading already shows `meta.name`).
- Keep the settings store (`addSettingsModule` → `contributes(AppCapabilities.Settings, …)`); only the form surface is redundant. Watch the name collision: `*Settings` capability (`./settings`, store) ≠ `*Settings` component (form).

### Module / barrel removal

- If a `ReactSurface` module held only the settings form, remove the whole module (the `capabilities/index.ts` export + the `addSurfaceModule` call), not just the body.
- Dropping a `containers`/`components` barrel ⇒ also drop the `#containers`/`#components` `imports` entry in `package.json` AND the `--entryPoint=…` in `moon.yml`. A dangling entrypoint breaks the build.

### Translations

- `plugin.name` is a convention (~64 plugins) — keep it. `settings.title` was per-component — delete when its component is removed and unreferenced.

### Layout / scrolling

- `<div overflow-y-auto>` inside `Panel.Content` does NOT scroll. `Panel.Content` = `[grid-area:content] min-h-0` (bounded block). Root must fill it: `flex flex-col dx-container`.
- `dx-container` = `flex-1 min-h-0 min-w-0 h-full w-full overflow-hidden`; no flex-direction, so keep `flex flex-col`.
- `ScrollArea.Root` theme already includes `dx-container` — do NOT add `min-h-0 grow`/`h-full`.
- Pattern: pinned region (`shrink-0`, `border-b border-separator`) + scrolling region (stack or `ScrollArea`).
- No `role='none'` on plain layout divs.
- No arbitrary spacing (`p-3`, `gap-2`). Use design-token utilities (`p-form-gap`, `gap-form-gap`, `pb-form-gap` — backed by `--spacing-form-gap`) or embed in `Form.Viewport`/`Form.Content` and let the form supply spacing.

### Forms

- Drive forms from an Effect Schema, not hand-rolled `Input`/`Select`: `<Form.Root schema values onValuesChanged><Form.Content><Form.FieldSet/></Form.Content></Form.Root>`. Reuse the operation-input schema (e.g. `BookingSearch.FlightSearchFields`).
- Labels come from schema `title`. `Format.DateTime` → datetime picker, stored ISO 8601.
- For multi-field forms, lay out with `Form.Layout template={…}` (grid DSL: `<grid cols="2"><field name="x" span="2"/></grid>`) instead of `Form.FieldSet` — same approach as `SegmentCard`'s `FLIGHT_LAYOUT`. Template controls which fields render (unreferenced fields are hidden). Define the template as a module-level `trim\`…\`` const (`@dxos/util`).
- Form structure (Radix `ScrollArea`-nominal: Viewport=viewing window outside, Content=viewed body inside). Uniform: `Form.Root > Form.Viewport > Form.Content`.
  - **`Form.Viewport`** owns the gutter `Column` (default `gutter='xs'` = chrome side-padding). Content-height by default; **`scroll`** prop makes it fill its parent + scroll (the gutter then hosts the scrollbar). The scroll/grow lives here, not on Content; there is no `grow` prop.
  - **`Form.Content`** is the pure viewed body (centered, `gap-form-gap`, `role=form`). No Column.
  - Content-height: `<Form.Root><Form.Viewport><Form.Content>…</Form.Content></Form.Viewport></Form.Root>`. Fill+scroll: add `scroll` to `Form.Viewport`.
  - Gotcha: `Card.Root` is itself a `.dx-column-root` and `Card.Body` is `display:contents`, so `Form.Viewport`'s Column must carry `[.dx-column-root_&]:col-span-full` to span the card instead of landing in the narrow icon track. (Built into `Form.Viewport`.)
  - `Settings.*` (from `@dxos/react-ui-form`) is a separate namespace from `Form.*` — settings panels use `Settings.Viewport`/`FieldSet`, unaffected.
- Submit via `Form.Submit` (full-width primary, calls the form's `onSave`), not a standalone `Button`. Wire `onSave` on `Form.Root`; pass `Form.Submit` `label`/`icon`/`disabled` as needed (`disabled` defaults to `!canSave`).
- Form-level error/validation text → `<Form.Error>{msg}</Form.Error>` (`react-ui-form`; wraps `Input.Root validationValence='error'` + `Input.Validation`), not a bare `text-error` div.

### Lists

- Reuse the mosaic stack, not `<button>` rows. Mirror `plugin-trip` `SegmentStack`/`SegmentTile`: `Focus.Group asChild` → `Mosaic.Container asChild withFocus currentId` → `ScrollArea.Root` → `ScrollArea.Viewport` → `Mosaic.Stack` (`Tile`, `items`, `getId`, `draggable={false}`). Stack bundles its own `ScrollArea.Root`.
- Tile = `forwardRef` + `Mosaic.Tile asChild` + `Focus.Item asChild current onCurrentChange` → `Card.Root`. Activate via `useMosaicContainer().setCurrentId` + `onCurrentChange`.
- `Card.Header` = 3-slot subgrid (icon · content `1fr` · trailing action). A wide value as the 3rd child clips in the narrow action slot — put title + value in one flex row as the single slot-2 child.

### Naming

- Alias an imported types namespace descriptively, not with a terse abbreviation: `import { type BookingSearch as BookingSearchType }`, not `as BS`.

### Booking / provider boundary (plugin-trip)

- The `BookingSearch` query/offer types are the normalized boundary — they use the canonical `Segment` vocabulary (`serviceClass` not `cabinClass`, `operator` not `carrier`, `number` not `flightNumber`, `departAt`/`arriveAt`/`origin`/`destination`). Provider implementations (e.g. plugin-duffel) map their API fields (`cabin_class`, `owner`, `marketing_carrier`, …) **to/from** these standard types in their `*-mapping.ts`; never leak provider-specific names past the `BookingService` boundary.

### Reactivity (Ref arrays)

- A `Schema.Array(Ref.Ref(...))` field renders **empty on first mount** and goes **stale after add/remove** if you read `ref.target` synchronously and memoize over it. Use `useObjects(obj.refs)` (`@dxos/echo-react`, re-exported from `@dxos/react-client/echo`) to reactively load + subscribe to each target (fixes empty-on-load and re-renders on target edits), and `useObject(obj, 'arrayProp')` to subscribe to the array property for add/remove. Key derived lists on `[refs?.length, loaded]` — not on `.target` reads or proxy-array identity (those don't change on splice).
- Display order and keyboard-nav order must come from **one canonical sort** (e.g. `Trip.getSegments`); don't re-sort inside the list component, or focus (`useArticleKeyboardNavigation`) and rendering diverge. Keep tie-breaks (e.g. undated-last) identical across both.

### Data types

- Model operation/persistence enums & structs as Effect Schema (`Schema.Literal`/`Schema.Struct`) with `type X = Schema.Schema.Type<typeof X>`, not bare TS. Bare TS is fine only for external wire shapes at an adapter boundary.
- In `Obj.update`, mutate a sub-struct via `Object.assign(target, { … })`, not field-by-field (whole-object assignment fights readonly schema-Type vs mutable instance-Type).
