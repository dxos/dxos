# Components SDK

- Put the exported component at the top of the file.
- Create translation entries for all user-facing strings.

## Tailwind

- We are in the process of moving away from CSS fragments (e.g., react-ui/src/fragments) to using Tailwind component classes.

## Slots

Exemplar: `packages/ui/react-ui/src/exemplars/slot.stories.tsx`.

## Schema

- Use `omitId` to remove the `id` field from schemas when passing them to `react-ui-form`.
- Always wrap `omitId()` in `useMemo` — never call inline in JSX props.

## Storybook

- Initially create a single simple story for each component and a test that the story loads without errors.
