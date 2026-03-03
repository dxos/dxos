---
name: rename-imports
description: Rename TypeScript import symbols across the monorepo using scripts/rename.mjs. Use when moving exports between packages, extracting symbols to new packages, or renaming exported symbols repo-wide.
---

# Rename Imports

Use `scripts/rename.mjs` to rename TypeScript import symbols across the monorepo.

## Syntax

```bash
./scripts/rename.mjs --rename='oldPackage#oldSymbol:newPackage#newSymbol'
```

Multiple renames in one invocation:

```bash
./scripts/rename.mjs \
  --rename='@dxos/old-pkg#Foo:@dxos/new-pkg#Foo' \
  --rename='@dxos/old-pkg#Bar:@dxos/new-pkg#Bar'
```

## Known Bug: Single-Import Crash

When the target symbol is the **only** named import in a declaration, the script removes the declaration then crashes trying to process subsequent `--rename` mappings on the same (now-deleted) AST node.

**Workaround**: If a symbol may be the sole import in any file, run each symbol as a **separate invocation**:

```bash
# GOOD: one symbol per invocation
./scripts/rename.mjs --rename='@dxos/old#Foo:@dxos/new#Foo'
./scripts/rename.mjs --rename='@dxos/old#Bar:@dxos/new#Bar'

# BAD: crashes when Foo is the only import from @dxos/old
./scripts/rename.mjs \
  --rename='@dxos/old#Foo:@dxos/new#Foo' \
  --rename='@dxos/old#Bar:@dxos/new#Bar'
```

Multiple `--rename` flags are safe when sources share other remaining imports (e.g., moving `Foo` and `Bar` but the file also imports `Baz` from the same package).

## Post-Script Cleanup

The script has two issues that require manual cleanup after running:

1. **Double quotes**: New imports use `"` instead of `'`. Fix with:

   ```bash
   find packages -name '*.ts' -not -path '*/node_modules/*' -not -path '*/dist/*' \
     -exec grep -l 'from "@dxos/new-pkg"' {} \; \
     | xargs sed -i '' "s/from \"@dxos\/new-pkg\"/from '@dxos\/new-pkg'/g"
   ```

2. **Import ordering**: New imports are appended at the end of the import block. Run the linter to fix:

   ```bash
   moon run <package>:lint -- --fix
   ```

## Scope

- Processes all `.ts` and `.tsx` files in the monorepo.
- Respects `.gitignore`, ignores `node_modules/`, `dist/`, `build/`.
- Only handles **named imports** (`import { X } from '...'`).
- Does NOT handle: default imports, namespace imports (`import * as`), re-exports, or `require()` calls.

## Checklist After Running

- [ ] Verify no old imports remain: `grep -r "from '@dxos/old-pkg'" packages/ --include='*.ts'`
- [ ] Fix double quotes (see above).
- [ ] Update `package.json` dependencies in consuming packages.
- [ ] Update `tsconfig.json` references in consuming packages.
- [ ] Update generated proto files if the symbol was used in code generation.
- [ ] Run `pnpm install` and build to verify.
