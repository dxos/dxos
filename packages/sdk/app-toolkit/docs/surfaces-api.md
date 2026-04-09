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

Registers a React component for a specific role and data shape.

```typescript
import { Surface } from '@dxos/app-framework/ui';

Surface.create({
  // Unique identifier for this surface.
  id: 'article',
  // Role(s) this surface renders in. Can be a string or array.
  role: ['article', 'section'],
  // Optional: controls rendering order. 'hoist' renders first.
  position: 'hoist',
  // Filter function — a type predicate that narrows the data type.
  // The predicate is required because it determines the type of `data`
  // passed to the component. TypeScript uses it to infer the component's props.
  filter: (data): data is { subject: MyType } => isMyType(data.subject),
  // React component to render. `data` is typed by the filter's predicate.
  component: ({ data, role }) => <MyComponent subject={data.subject} role={role} />,
});
```

### Common Roles

| Role                   | Where it renders               | Used for                             |
| ---------------------- | ------------------------------ | ------------------------------------ |
| `article`              | Main content area (plank body) | Primary object views, settings pages |
| `section`              | Inline sections within planks  | Compact/embedded views               |
| `object-settings`      | Per-object settings panel      | Object configuration UI              |
| `status-indicator`     | Application status bar         | Status icons, indicators             |
| `form-input`           | Form field slots               | Custom form inputs                   |
| `deck-companion--{id}` | Deck sidebar companion         | Workspace-wide panels                |

## App-Toolkit Filters: `AppSurface`

`AppSurface` from `@dxos/app-toolkit/ui` provides type-safe filter predicates for common patterns. Each returns a type predicate that narrows the surface data to the expected shape.

### Object Filters

```typescript
import { AppSurface } from '@dxos/app-toolkit/ui';

// Matches articles displaying an ECHO object of this type.
// Narrows data to: { subject: MyType, attendableId: string }
AppSurface.objectArticle(MySchema);

// Matches object settings for this type.
// Narrows data to: { subject: MyType }
AppSurface.objectSettings(MySchema);

// Matches sections displaying an ECHO object of this type.
AppSurface.objectSection(MySchema);

// Matches card views for this type.
AppSurface.objectCard(MySchema);
```

### Literal Filters

```typescript
// Matches when subject is a specific string literal.
// Used for companions and devtools panels.
AppSurface.literalArticle('details');
AppSurface.literalSection('my-panel');
```

### Settings Filter

```typescript
// Matches the settings page for this plugin.
// Narrows data to: { subject: { atom: Atom.Writable<Settings> } }
AppSurface.settingsArticle(meta.id);
```

### Companion Filter

```typescript
// Matches companion panels attached to an ECHO object of this type.
// Narrows data to: { companionTo: MyType }
AppSurface.companionArticle(MySchema);

// Matches companion panels for any ECHO object.
AppSurface.companionArticle();
```

### Composing Filters

```typescript
// `and()` composes multiple filters with type intersection.
// Both filters must match for the surface to render.
AppSurface.and(AppSurface.literalArticle('related'), AppSurface.companionArticle(MySchema));
```

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

- **plugin-exemplar**: [`src/capabilities/react-surface.tsx`](../../plugins/plugin-exemplar/src/capabilities/react-surface.tsx) — Demonstrates article, settings, companion, deck companion, and status indicator surfaces.
- **plugin-kanban**: [`src/capabilities/react-surface.tsx`](../../plugins/plugin-kanban/src/capabilities/react-surface.tsx) — Article, object settings, and custom form input surfaces.
- **plugin-debug**: [`src/capabilities/react-surface.tsx`](../../plugins/plugin-debug/src/capabilities/react-surface.tsx) — Extensive example with devtools panels, companions, and status indicators.
