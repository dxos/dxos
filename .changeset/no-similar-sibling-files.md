---
'@dxos/eslint-plugin-rules': minor
---

New `no-similar-sibling-files` rule reports sibling source files whose names differ only by case,
`-`/`_`, or a plural suffix (`Space.ts` next to `Spaces.ts`, `IconRegistry.tsx` next to
`icon-registry.ts`). Variants of one module (`Space.test.ts`, `Space.stories.tsx`) share a stem and
are not reported; an `allow` option exempts files by path suffix.
