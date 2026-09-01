---
'@dxos/eslint-plugin-rules': patch
---

Fix `dxos-subpath-exports`, `dxos-package-imports`, and `import-as-namespace` failing to resolve relative specifiers that already carry a file extension (e.g. `./types/index.ts`), which silently disabled their checks on any barrel using explicit-extension imports.
