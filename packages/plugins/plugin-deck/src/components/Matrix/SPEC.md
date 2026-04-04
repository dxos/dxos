# Matrix

## Background

- DeckMain currently has two modes: `deck` and `solo`;
- In `deck` mode we have a horizontal scrolling list of `Plank` objects;
- In `solo` mode we have a single `Plank` object that fills the viewport with a companion `Plank` area to the right;
- `Matrix` is an experimental alternative to `DeckMain`, which contains a horizontal `Matrix.Stack`.
- `Matrix` is a low-level component that does not depend directly on `Plank`.
- NOTE: Be careful not to mix-up `Mosaic.Stack` with `react-ui-stack` (which is deprecated).

## Experiment

### Phase 1

- [ ] Remove `useAppGraph` from `Plank` and instead pass in the `Node`.
- [ ] Create a Tile that wraps `Plank` (which contains `Surface` components).
- [ ] Create a story variant that provides this Tile in the args; you need to provide the appropriate decorators to support Surfaces.s
- [ ] The decorator must define react-surface extensions that resolves the Surface to the given object type. It's ok initially to have just one surface provider.
- [ ] The right-most `Plank` serves as the "companion" area for the `Plank` to its left.
- [ ] Given the items in the current story we should see 4 Planks in the Matrix: Organization, Person, Text, Companion.
- [ ] Make Matrix responsice so that if we're on a phone only one `Plank` is visible at a time.

### Phase 2

Our goal is to replace DeckMain with a new layout (Matrix) using react-ui-matrix instead of react-ui-stack.
We must decide whether to incrementally evolve Plank or recreate it.

- [ ] Analyize the `DeckMain` and `Plank` components and make recommendations for how to simplify.
- [ ] Create a concise spec for the functionality of both `DeckMain` and `Plank` (about 20 bullets each).
- [ ] Refactor `DeckMain` as radix-style composite component.
  - This enables us to separate the functionality so that we can isolate the use of react-ui-stack
  - Instead of `useAtomCapability` and `usePluginManager` pass the associated objects into `Root`.
- [ ] Refactor `Plank` as radix-style composite component.
  - Factor out the need for `useCapability` and other app-toolkit hooks/context; instead pass the require objects (e.g., `AppGraph`) to `Plank.Root`
  - Provide callbacks instead of internally relying on `useOperationInvoker`.
- [ ] Check everything builds.
