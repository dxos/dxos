# Surfaces API

## What Are Surfaces?

Surfaces are the rendering layer of Composer. They connect graph nodes to React components through a role-based matching system. The layout decides which roles to render, and each plugin declares which components handle which data.

This decoupling means plugins don't need to know about each other's UI — they just declare what they can render and for which data. Any plugin component can define a surface slot that other plugins can fulfill.

## How Surfaces Fit Together

The layout plugins (deck, simple-layout) are one canonical consumer of surfaces — they render roles like `article`, `status-indicator`, and `deck-companion--{id}`. But surfaces are a general mechanism: any plugin component can render a `Surface.Surface` element with a role, and any other plugin can register a surface to fulfill it.

1. A component renders a surface slot with a role and data.
2. The framework queries registered surfaces for that role.
3. Each surface's filter function (a type predicate) tests the data.
4. The first matching surface's component renders, receiving the narrowed data type.

## Core API: `@dxos/app-framework`

### `Surface.create(options)`

Registers a React component for a specific role and data shape. Prefer the typed
form: pass an `AppSurface` filter and the role is derived from its bindings.

```typescript
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

// Typed form — role carried by the filter.
Surface.create({
  id: 'article',
  filter: AppSurface.object(AppSurface.Article, MySchema),
  position: 'hoist',
  component: ({ data, role }) => <MyComponent subject={data.subject} role={role} />,
});

// Legacy form — still supported.
Surface.create({
  id: 'article',
  role: ['article', 'section'],
  filter: (data): data is { subject: MyType } => isMyType(data.subject),
  component: ({ data, role }) => <MyComponent subject={data.subject} role={role} />,
});
```

### Common Roles

| Role                   | Where it renders               | Used for                             |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `article`              | Main content area (plank body) | Primary object views, settings pages |
| `section`              | Inline sections within planks  | Compact/embedded views               |
| `object-properties`    | Per-object properties panel    | Object configuration UI              |
| `status-indicator`     | Application status bar         | Status icons, indicators             |
| `form-input`           | Form field slots               | Custom form inputs                   |
| `deck-companion--{id}` | Deck sidebar companion         | Workspace-wide panels                |

## App-Toolkit Filters: `AppSurface`

`AppSurface` from `@dxos/app-toolkit/ui` provides typed role tokens and filter
builders. A filter is a `Surface.Filter<TData>` carrying both the role(s) it
applies to and a runtime guard that narrows the data type.

### Role tokens

```typescript
import { AppSurface } from '@dxos/app-toolkit/ui';

// Built-in tokens: Article, Section, Card, Slide, Tabpanel, Related, Dialog,
// Popover, Navigation, MenuFooter, NavbarEnd, DocumentTitle.
// Mint your own:
import { Surface } from '@dxos/app-framework/ui';
const MyRole = Surface.makeType<{ subject: MyShape }>('my-plugin/my-role');
```

### Object filters

```typescript
// Matches article-role ECHO objects of this type (requires attendableId).
AppSurface.object(AppSurface.Article, MySchema);

// Matches section-role ECHO objects of this type.
AppSurface.object(AppSurface.Section, MySchema);

// Array of schemas narrows subject to their union.
AppSurface.object(AppSurface.Card, [SchemaA, SchemaB]);

// Object-properties panel.
AppSurface.object(AppSurface.ObjectProperties, MySchema);
```

### Component filter

```typescript
// Matches dialog/popover content by `data.component === id`.
AppSurface.component(AppSurface.Dialog, MY_DIALOG_ID);
// Second type parameter narrows `data.props` at the call site:
AppSurface.component<typeof MY_DIALOG_ID, { onClose: () => void }>(AppSurface.Dialog, MY_DIALOG_ID);
```

### Settings filter

```typescript
// Matches the plugin settings article with the given prefix.
AppSurface.settings(AppSurface.Article, meta.id);
```

### Predicate lift

```typescript
// Wraps an ad-hoc predicate for a given role so it composes via `and`.
AppSurface.predicate(AppSurface.Article, (data) => data.variant === undefined);
```

### Companion filter

```typescript
// Matches when data.companionTo is an ECHO object of this type.
AppSurface.companion(AppSurface.Article, MySchema);
// Or a literal string.
AppSurface.companion(AppSurface.Article, 'feeds-root');
// Or any ECHO object.
AppSurface.companion(AppSurface.Article);
```

### Combinators

```typescript
// oneOf: register across multiple roles with the same (or differing) guards.
AppSurface.oneOf(
  AppSurface.object(AppSurface.Article, MySchema),
  AppSurface.object(AppSurface.Section, MySchema),
);

// allOf: same-role intersection (all filters must share the same role set).
AppSurface.allOf(
  AppSurface.object(AppSurface.Article, MySchema),
  AppSurface.predicate(AppSurface.Article, (data) => data.variant === undefined),
);

// Article/Section/Tabpanel tokens inherently require `data.attendableId` to be
// a string — no additional wrapper needed when combining them via oneOf.
AppSurface.oneOf(
  AppSurface.object(AppSurface.Article, MySchema),
  AppSurface.object(AppSurface.Section, MySchema),
);
```

### Legacy predicate filters

Still supported for the literal/section/graph-node/plugin/schema/snapshot
patterns that have not been ported to the typed form:
`literalArticle`, `literalSection`, `anyObjectSection`, `graphNodeSection`,
`pluginSection`, `schemaSection`, `snapshotSection`, `companionArticle`,
`objectProperties`. These return raw type predicates and compose via the
two-argument form of `AppSurface.allOf(leftPred, rightPred)`.

Prefer the typed equivalents:

- `literalArticle(v)` → `literal(AppSurface.Article, v)`
- `literalSection(v)` → `literal(AppSurface.Section, v)`
- `companionArticle(...)` → `companion(AppSurface.Article, ...)`
- `anyObjectSection()` → `subject(AppSurface.Section, Obj.isObject)`
- `graphNodeSection()` → `subject(AppSurface.Section, Node.isGraphNode)`
- `pluginSection()` → `subject(AppSurface.Section, Plugin.isPlugin)`
- `snapshotSection(S)` → `snapshot(AppSurface.Section, S)`
- `objectProperties(S)` → `object(AppSurface.ObjectProperties, S)`

## App-Toolkit Helper: `AppPlugin.addSurfaceModule`

Registers surface contributions during the `SetupReactSurface` activation event.

```typescript
export const MyPlugin = Plugin.define(meta).pipe(
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  // ...
);
```

## Container Lazy Loading

Containers are lazy-loaded to enable code-splitting. Each container file exports a default component, and the barrel uses `React.lazy()`:

```typescript
// containers/index.ts
import { type ComponentType, lazy } from 'react';

export const MyArticle: ComponentType<any> = lazy(() => import('./MyArticle'));
```

## Examples

- **plugin-sample**: [`src/capabilities/react-surface.tsx`](../../plugins/plugin-sample/src/capabilities/react-surface.tsx) — Demonstrates article, settings, companion, deck companion, and status indicator surfaces.
- **plugin-kanban**: [`src/capabilities/react-surface.tsx`](../../plugins/plugin-kanban/src/capabilities/react-surface.tsx) — Article, object settings, and custom form input surfaces.
- **plugin-debug**: [`src/capabilities/react-surface.tsx`](../../plugins/plugin-debug/src/capabilities/react-surface.tsx) — Extensive example with devtools panels, companions, and status indicators.
