# Components

Presentational UI primitives in `src/components/`. **No DXOS framework deps.**

## Rules

- **Forbidden imports:** `@dxos/app-framework`, `@dxos/app-toolkit`, capability barrels, `useQuery`/`useObject`. If you need them, you're writing a container.
- **Allowed:** `@dxos/react-ui`, `@dxos/ui-theme`, plain React, libraries owned by the component.
- One subdirectory per component:
  ```text
  components/
    index.ts                # barrel: export * from './Thing';
    Thing/
      index.ts              # export { Thing } from './Thing';
      Thing.tsx             # named export only
      Thing.stories.tsx
  ```
- **No default exports** anywhere in `components/`.
- Each component ships a basic storybook that exercises its visual states.

## Public re-export

If another plugin needs the component, also re-export it from the package root via `src/index.ts`:

```ts
export * from './components/Chessboard';
```

(Per-component public exports are fine; `export *` from the top-level barrel is not — keep `src/index.ts` minimal.)

## Reference

- `packages/plugins/plugin-chess/src/components/Chessboard/`
