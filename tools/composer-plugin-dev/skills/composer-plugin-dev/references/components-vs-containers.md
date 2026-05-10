# Components vs containers

This separation is **non-negotiable**. It's the single biggest determinant of whether your plugin stays maintainable.

## Components (`src/components/`)

Presentational primitives. Reusable. Testable in isolation.

- **MUST NOT depend on** `@dxos/app-framework` or `@dxos/app-toolkit`.
- **MUST NOT** read from ECHO, capabilities, or surfaces.
- Receive everything as props.
- Named exports only — no default exports.
- One subdirectory per component with its own `index.ts` barrel and a basic storybook.

If a component needs framework data, it's actually a container — move it.

## Containers (`src/containers/`)

Surface components. They consume capabilities, query ECHO, dispatch operations, and render the right primitives.

- Each container has its own subdirectory.
- The subdirectory `index.ts` bridges named → default export so `React.lazy` works:
  ```ts
  export { FooArticle as default } from './FooArticle';
  ```
- The top-level `containers/index.ts` lazy-loads them:
  ```ts
  export const FooArticle: ComponentType<any> = lazy(() => import('./FooArticle'));
  ```
- Surface containers use suffixes matching their role: `Article`, `Card`, `Section`, `Dialog`, `Popover`, `Settings`.
- Container-to-container imports use the default import: `import OtherContainer from '../OtherContainer';`.
- Add a basic storybook for each.

## Why split?

- **Bundle size.** Containers are lazy; the bundle for an article only loads when that article is rendered.
- **Testability.** Components have no DXOS deps and can be unit-tested or storied without a harness.
- **Reuse.** A `Chessboard` component is reusable; a `ChessArticle` container is not.
- **Refactor safety.** Changes to capabilities don't ripple into presentational code.

## Heuristic

> If you `import { useQuery }` or anything from `@dxos/app-framework`, you're in a container, not a component.

See also: [containers.md](./containers.md), [components.md](./components.md).
