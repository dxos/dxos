# Components SDK

- Put the exported component at the top of the file.
- Create translation entries for all user-facing strings.

## Tailwind

- We are in the process of moving away from CSS fragments (e.g., react-ui/src/fragments) to using Tailwind component classes.

## Slots

Types are in `@dxos/ui-types/src/slot.ts`. Exemplar: `packages/ui/react-ui/src/exemplars/slot.stories.tsx`.

Key rules:

- `ComposableProps` is **generic** — pass the HTML element type (e.g., `ComposableProps<HTMLDivElement>`).
- `composableProps()` is also **generic** — pass the element type (e.g., `composableProps<HTMLDivElement>(props)`).
- Always use `forwardRef` — both patterns require ref forwarding (variable `forwardedRef`).
- Spread `...composableProps(props)` (which reconciles `className`/`classNames`) — don't manually destructure and use `mx()`.
- Custom callback props must NOT collide with HTML attribute names (e.g., use `onLayerUpdate` not `onChange`, use `onUpdate` not `onChange`).

## Schema

- Use `omitId` to remove the `id` field from schemas when passing them to `react-ui-form`.
- Always wrap `omitId()` in `useMemo` — never call inline in JSX props.

## Storybook

- Initially create a single simple story for each component and a test that the story loads without errors.
