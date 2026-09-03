---
# multiple-changesets: unrelated protobuf-compiler fix rides along, found by the same migration
'@dxos/eslint-plugin-rules': patch
---

Fix `dxos-subpath-exports`, `dxos-package-imports`, and `import-as-namespace` failing to resolve relative specifiers that already carry a file extension (e.g. `./types/index.ts`), which silently disabled their checks on any barrel using explicit-extension imports. Also fix three places where the same three rules derived a name or counted path depth straight off an extensioned specifier: `dxos-subpath-exports`'s nested-export check miscounted `./dir/index.ts` as one level deeper than `./dir`, `import-as-namespace` derived the namespace `index` instead of the directory name for a directory barrel, and `dxos-package-imports`'s self-import regex no longer matched a barrel's own extensioned re-export.
