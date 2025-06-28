# DXOS Storybook

Storybook config package for the DXOS monorepo.

## Issues

- Storybook 8.2.1 throws the following error when running `pnpm nx storybook stories`:
  - `NX   Invariant failed: Expected package.json#version to be defined in the "undefined" package}`

Build and test the storybook bundle:

```bash
pnpm -w nx run stories:bundle
npx http-server ./out/stories/index.html
```
