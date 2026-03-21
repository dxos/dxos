---
name: dxos-plugins
description: >-
  Guide for creating, maintaining, and refactoring DXOS Composer plugins.
  Use when working on files in packages/plugins/, adding new plugins,
  refactoring plugin components/containers, writing storybooks for plugins,
  or wiring capabilities like react-surface or operation-resolver.
---

# DXOS Plugins

Read `packages/plugins/AGENTS.md` for detailed per-plugin status, observations, and task tracking.
Treat `plugin-kanban` as the exemplar — mirror its structure for new plugins.

## Plugin Directory Structure

```
plugin-example/
├── moon.yml
├── package.json              # Must have "private": true
├── src/
│   ├── index.ts              # Exports meta + ExamplePlugin
│   ├── meta.ts               # Plugin metadata
│   ├── translations.ts       # i18n strings
│   ├── ExamplePlugin.tsx     # Plugin definition
│   ├── capabilities/
│   │   ├── index.ts          # Re-exports all capabilities
│   │   ├── react-surface/
│   │   │   ├── index.ts      # Capability.lazy('ReactSurface', () => import('./react-surface'))
│   │   │   └── react-surface.tsx
│   │   └── operation-resolver/
│   │       ├── index.ts
│   │       └── operation-resolver.ts
│   ├── components/            # Primitives (no @dxos/app-framework hooks)
│   │   ├── index.ts
│   │   └── MyWidget/
│   │       ├── index.ts
│   │       ├── MyWidget.tsx
│   │       └── MyWidget.stories.tsx
│   ├── containers/            # Surface components (use app-framework hooks)
│   │   ├── index.ts           # Lazy exports: lazy(() => import('./X'))
│   │   └── MyArticle/
│   │       ├── index.ts       # import { MyArticle } from './MyArticle'; export default MyArticle;
│   │       ├── MyArticle.tsx
│   │       └── MyArticle.stories.tsx
│   ├── types/
│   │   ├── index.ts
│   │   └── schema.ts
│   └── hooks/                 # Optional
│       └── index.ts
```

## Primitives vs Containers

| Aspect | Primitives (`src/components/`) | Containers (`src/containers/`) |
|--------|-------------------------------|-------------------------------|
| Location | `src/components/SubDir/` | `src/containers/SubDir/` |
| App-framework hooks | Never | Yes |
| Exports | Named (barrel imports) | Default (for `React.lazy`) |
| Lazy loading | No | Yes, via `containers/index.ts` |
| Referenced by | Containers, stories | `react-surface` capability |
| Storybooks | Required for each | Required when feasible |

### Container index.ts pattern

Each container subdirectory bridges named to default:

```typescript
import { MyArticle } from './MyArticle';
export default MyArticle;
```

Top-level `containers/index.ts` uses lazy:

```typescript
import { type ComponentType, lazy } from 'react';

export const MyArticle: ComponentType<any> = lazy(() => import('./MyArticle'));
export const MySettings: ComponentType<any> = lazy(() => import('./MySettings'));
```

Add `: ComponentType<any>` when TypeScript emits TS2742 ("inferred type cannot be named").
Use `ForwardRefExoticComponent<Props>` instead when the component uses `forwardRef`.

Re-export prop types if needed externally:

```typescript
export type { MyArticleProps } from './MyArticle/MyArticle';
```

## Surface Components Rules

- Referenced only from `src/capabilities/react-surface/`.
- Should define and export a `SurfaceComponentProps` type.
- Must not use `className` or custom CSS (except Tailwind functional styles like `@container`, `dx-document`).
- Should implement `<Suspense>` only if they use `React.use()` or render internal lazy sub-components. The `Surface` component in app-framework already provides the outer boundary.
- Name suffixes matching roles: `Article`, `Card`, `Dialog`, `Popover`, `Settings`.

## Capabilities

Each capability lives in `src/capabilities/<name>/` with:
- `index.ts` — lazy export: `export const X = Capability.lazy('X', () => import('./x'));`
- Implementation file.

Common capabilities: `react-surface`, `operation-resolver`, `artifact-definition`, `blueprint-definition`, `app-graph-builder`.

`capabilities/index.ts` re-exports all:

```typescript
export * from './react-surface';
export * from './operation-resolver';
```

## Reactivity

All interfaces must be real-time reactive. ECHO objects must use appropriate hooks (`useQuery`, `useObject`, etc.) — never poll or manually refresh.

## Code Style (Plugin-specific)

- Use `invariant` over throwing Errors for preconditions.
- Barrel imports from `components/index` — no default exports in `src/components/`.
- Container-to-container imports use default: `import X from '../X';`.
- String constants for dialog/surface role IDs go in `src/constants.ts`, not inline in `react-surface.tsx`.
- Create translation entries for all user-facing strings.

## Storybooks

- Every primitive component gets a simple `Default` story.
- Story names must match the plugin and component name.
- Containers get stories when feasible (some need space/db context — defer these).
- Run smoke tests: `moon run <plugin>:test-storybook`.

## Refactoring Containers (Task Checklist)

1. Factor out `@dxos/app-framework` hooks from the component into a primitive.
2. Move the surface component to `containers/SubDir/`.
3. Create `index.ts` bridging named → default export.
4. Update `containers/index.ts` with lazy export.
5. Update `react-surface.tsx` imports to use `../../containers`.
6. Create storybooks for new primitives.
7. Build: `moon run <plugin>:build`.
8. Lint: `moon run <plugin>:lint -- --fix`.
9. Run tests: `moon run <plugin>:test`.
10. Update `packages/plugins/AGENTS.md` with actions taken.

## Build & Test

```bash
moon run <plugin>:build
moon run <plugin>:lint -- --fix
moon run <plugin>:test
moon run <plugin>:test-storybook    # Storybook smoke tests
```

Check `moon.yml` in the plugin directory for available tasks.
