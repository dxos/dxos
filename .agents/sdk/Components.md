# Components SDK

- Put the exported component at the top of the file.
- Create translation entries for all user-facing strings.

## Tailwind

- We are in the process of moving away from CSS fragments (e.g., react-ui/src/fragments) to using Tailwind component classes.

## Slots

Types are in `@dxos/ui-types/src/slot.ts`. Exemplar: `packages/ui/react-ui/src/exemplars/slot.stories.tsx`.

Key rules:

- `ComposableProps` takes 0-1 type args for custom props only (e.g., `ComposableProps` or `ComposableProps<MyProps>`). Do NOT pass HTML element types.
- `composableProps()` reconciles `className`/`classNames` — no type parameter needed.
- Always use `forwardRef` — both patterns require ref forwarding (variable `forwardedRef`).
- Spread `...composableProps(props)` (which reconciles `className`/`classNames`) — don't manually destructure and use `mx()`.
- Custom callback props must NOT collide with HTML attribute names (e.g., use `onLayerUpdate` not `onChange`, use `onUpdate` not `onChange`).

## Schema

- Use `omitId` to remove the `id` field from schemas when passing them to `react-ui-form`.
- Always wrap `omitId()` in `useMemo` — never call inline in JSX props.

## Storybook

- Initially create a single simple story for each component and a test that the story loads without errors.
