# UI

## General

- Put the exported component at the top of the file.
- Create translation entries for all user-facing strings.

## Components

- When creating container components consider the use of structured `Panel` (react-ui) components.
- Containers should be wrapped with `composable` or `slottable`.
  - Exemplar: `packages/ui/react-ui/src/exemplars/slot.stories.tsx`.

## Schema

- Use `omitId` to remove the `id` field from schemas when passing them to `react-ui-form`.
- Always wrap `omitId()` in `useMemo` — never call inline in JSX props.

## Storybook

- Initially create a single simple story for each component and a test that the story loads without errors.

## Testing

- Testing utilities should be in a package level directory `src/testing`.
- Use `createGenerator` in `@dxos/schema/testing` to generate test ECHO objects.
