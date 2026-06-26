# Surface

A Surface is a named region of the UI that is populated dynamically by plugins.
The consumer declares _what kind_ of region it is (a role) and _what data_ it
carries; the framework resolves which plugin-contributed component(s) render there.
This decouples the shell/layout from the plugins that fill it.

## Concepts

- **RoleToken** (`makeType<TData>(nsid)`) — a typed dispatch key. Carries a role
  NSID (e.g. `org.dxos.role.article`) plus a phantom `TData` so consumers
  (`type={Token}`) and providers (`makeFilter(Token, guard)`) share one
  type-level contract. Identity is structural: same `role` string ⇒ interchangeable.
- **SurfaceFilter** (`makeFilter(token, guard?)`) — one or more `(role, guard)`
  bindings. The guard validates the data shape at dispatch time; omitting it
  matches any data at the role.
- **Definition** — a registered contribution: `{ kind, id, role, position?, filter, … }`.
  `kind: 'react'` carries a `component`; `kind: 'web-component'` carries a `tagName`.
  Authored via `create` / `createWeb`; registered as the `Capabilities.ReactSurface`
  capability.

## Dispatch pipeline

```text
<Surface type={Token} data={…} limit?={n} />
  └─ useSurfaces()            → role-indexed, position-sorted candidate map
  └─ findCandidates(role,data)→ candidates for role, then data guard filter
  └─ Suspense
       └─ SurfaceContextProvider (per candidate)   ← ErrorBoundary + SurfaceContext
            └─ React component  | WebComponentWrapper
```

- **Indexing.** A per-manager derived atom builds a `Map<role, Definition[]>`
  once per contribution change with candidates already sorted by
  `Position.compare`. Per-render work is therefore just the data-dependent guard
  filter over one role's bucket — no full scan or re-sort on every render. The
  data guard is intentionally _not_ memoized so a Surface re-dispatches when
  reactive `data` changes.
- **Per-role subscription.** Each Surface subscribes to a derived atom for _its
  role only_ (`getCandidatesAtom`). The atom wraps the role's bucket with
  `Data.array`, so the atom registry compares results structurally (`Equal.equals`)
  and a contribution to another role recomputes to an equal value and is dropped —
  that role's subscribers never re-render. Re-renders therefore scale with the
  _affected role's_ surface count, not the total mounted fleet.

  Quantified (`SurfaceComponent.test.tsx`, 100 surfaces across 10 roles, one
  contribution per role): the old global subscription re-renders the whole fleet
  on every contribution (100/contribution); per-role re-renders only the affected
  role (20/contribution — one role's surfaces ×2 store commit phases) → **5×
  fewer re-renders**, and the ratio grows with the number of roles. A second case
  confirms 50 unrelated contributions cause 0 re-renders of an unaffected role.

- **`limit`.** Caps how many resolved candidates render (e.g. `limit={1}` for
  single-component regions).
- **`isSurfaceAvailable`.** Same matching logic against a `CapabilityManager`,
  used to probe whether a region would render without mounting it.

## Boundaries

Each matched candidate is wrapped in:

- **ErrorBoundary** (`name='surface'`, `resetKeys={[data]}`) — a failing surface
  is contained and shown via the `fallback` component; sibling surfaces survive.
- **SurfaceContext** — exposes `{ id, role, data }` to descendants via
  `useSurface()`. This is the supported way to read surface identity; the shell
  must not reach _into_ a surface.

A single `Suspense` (the consumer's `placeholder`) wraps all candidates.

### No `ref`

A Surface is a boundary, not a handle. It may resolve to zero, one, or many
components, so a forwarded `ref` has no well-defined target. The component does
not accept or forward a `ref`; consumers that need an element should own one
inside their contributed component.

### Production vs. debug DOM

In production a React candidate renders directly inside its context provider —
no wrapper element — so a Surface adds no layout box of its own. Debug builds
wrap each candidate in a `<dx-surface>` element (see below) that carries
`data-id` / `data-role` and provides a measurable boundary for overlays.

## Web Components

`createWeb({ tagName, … })` contributes a custom element instead of a React
component. `WebComponentWrapper` imperatively creates the element once, assigns
surface props as element properties, keeps them in sync, and removes the element
on unmount. The same props (`id`, `role`, `data`, `limit`, …) are passed as for
React surfaces.

## Debugging

Enabled when `VITE_DEBUG` is set (build-time) or the runtime flag is toggled
(no rebuild). When on:

- Each React candidate is wrapped in a `<dx-surface data-role data-id>` element —
  named, inspectable in DevTools, and queryable
  (`document.querySelectorAll('dx-surface')`).
- A single centralized overlay manager draws boundary highlights and an info
  affordance, instead of every surface mounting its own portal and observers.
- The React `Profiler` is attached per surface; `SurfaceProfiler*` collect
  render counts and durations for an in-app perf panel.

### Dev metrics

`SurfaceMetrics` (a module singleton, so the out-of-tree overlay and the in-app
devtools panel share one source) records, keyed by `surface/<id>/<role>`:

- **`dataUnstable` / `dataChurn`** — the consumer's `data` prop identity churns
  across renders without its value changing. This is the most common Surface
  footgun (see Performance notes) and nothing else detects it.
- **`candidates` / `truncated`** — candidates matched on the last dispatch, and
  whether `limit` dropped some. Diagnoses "nothing renders" (0) and "two things
  render" (ambiguous match).
- **`dispatches`** — how often the dispatcher re-resolved (the count the per-role
  subscription minimizes).
- **`errors`** — error-boundary trips for this surface.
- **`mounts` / `unmounts`** — mount churn (often a thrashing upstream `key`).

Recording is gated on the debug flag (zero production cost). Surfaced two ways:
the `dx-surface` overlay badge (turns ⚠/red on a concern; full metrics on
expand) and the devtools `SurfaceProfilerPanel` (joined onto render-timing by id).
`Surface.useMetrics()` / `Surface.clearMetrics()` expose the data.

## Performance notes

- Keep `data` referentially stable across renders — it is a memo/`resetKeys`
  dependency. Unstable `data` defeats candidate stability and trips error-boundary
  resets.
