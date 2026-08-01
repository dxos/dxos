# @dxos/story-modules

Surface-grid container for driving storybook layouts from a 2D array of module role tokens.

Each cell of the layout is an app-framework `Role` token (or `{ type, data }` spec) resolved via a
`Capabilities.ReactSurface` contribution, so contributed module surfaces source their own data
(e.g. via `useActiveSpace()`). Storybook-agnostic: any storybook that contributes module surfaces
can drive its layout with `ModuleContainer`.
