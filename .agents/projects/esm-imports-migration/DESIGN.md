# ESM imports migration

## Goal

Convert the whole repo's relative TypeScript imports/exports/dynamic-imports to
the explicit-extension ESM form that `tsconfig.base.json`'s
`rewriteRelativeImportExtensions: true` is designed for:

- `./foo` → `./foo.ts` or `./foo.tsx` (whichever exists on disk)
- `./dir` → `./dir/index.ts` (or `.tsx`)

Only relative specifiers (`./`, `../`) are touched — bare package specifiers
(`@dxos/foo`, `react`, `node:fs`) resolve via package.json `exports` and are
out of scope.

## Approach

`scripts/migrate-esm-imports.ts` — a TypeScript-AST-based codemod (not
regex/string-based) that:

1. Globs all `*.ts`/`*.tsx` under `packages/`, `scripts/`, `tools/`,
   `templates/` (excluding `node_modules`, `dist`, `build`, `.moon`,
   `storybook-static`, `coverage`, `.d.ts`).
2. Parses each file with `typescript`'s parser and walks the AST for:
   - `ImportDeclaration` / `ExportDeclaration` module specifiers
   - dynamic `import('./x')` calls
   - `ImportTypeNode` (`import('./x').Foo` type positions)
   - `new URL('./x', import.meta.url)` (vite worker/asset pattern)
3. For each relative string-literal specifier, resolves it against the real
   filesystem (case-sensitive `readdirSync`, cached per directory) and
   rewrites to the correct extension, preferring a same-named file over a
   directory with the same name. Strips/reattaches vite query suffixes
   (`?worker`, `?raw`, etc.) around resolution.
4. Edits are applied as raw text-span splices (not AST reprinting), so
   formatting elsewhere in the file is untouched.
5. Specifiers that already carry a `.ts`/`.tsx` extension are left alone if
   they match the filesystem; a wrong extension (e.g. `.js` written for a
   `.ts` file) is corrected. Non-code extensions (`.json`, `.css`, `.svg`,
   …) are left untouched — not in scope.
6. Anything that can't be resolved (missing file, computed/template
   specifier) is left unchanged and reported at the end for manual review.

## Validation

- `pnpm format` (oxfmt) — codemod should already be format-clean since it only
  touches string literal contents, but run it anyway per repo convention.
- `moon run :build` / typecheck across the repo (or a representative subset
  given repo size) to confirm resolution still works everywhere.
- `moon run :lint`
- Spot-check a sample of diffs across different package shapes (plain ts,
  tsx/react, barrel index files, deep relative `../../`).
