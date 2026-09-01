# ESM imports migration — tasks

- [x] Survey scope: ~7275 files with relative imports, ~14990 extensionless
      specifier occurrences; ~325 files already partially migrated
      (e.g. `packages/core/protocols/src/edge/index.ts`).
- [x] Write `scripts/migrate-esm-imports.ts` codemod (AST-based, text-splice
      edits, handles import/export/dynamic-import/import-type/new URL()/vi.mock).
- [x] Dry-run / spot-check on a sample package before repo-wide run
      (`protocols`, `react-ui-list`).
- [x] Run codemod across `packages/`, `scripts/`, `tools/`, `templates/`
      (7118 files changed, idempotent, 0 unresolved on the final pass).
- [x] Review unresolved-specifier report; hand-fix stragglers (ran codegen
      for `protocols` and `react-ui-gameboard`, which have build-time
      generated `.ts` sources; fixed a `new URL()` false-positive that broke
      3 non-Worker directory-path uses; extended fallback resolution to
      `.js` for one vendored wasm bindings import).
- [x] `pnpm format`.
- [x] `moon run :build` full repo — clean except one PRE-EXISTING unrelated
      failure (`protobuf-compiler/test/types.test.ts`, a Timestamp/Any type
      mismatch, confirmed by reverting the file and re-running).
- [x] `moon run :lint` full repo — found and fixed a REAL regression: three
      custom oxlint rules (`dxos-subpath-exports`, `dxos-package-imports`,
      `import-as-namespace` in `packages/common/eslint-plugin-rules/rules/`)
      had a `resolveModule()` that always appended an extension, breaking on
      already-extensioned specifiers (e.g. `./types/index.ts` →
      `index.ts.ts`, never found). Fixed all three with an early-return when
      the specifier already carries a known extension. Verified against
      `compute:lint` (was failing, now passes) and confirmed one remaining
      test failure in `eslint-plugin-rules` itself is pre-existing/unrelated.
      Full `moon exec --on-failure continue --quiet :lint` across all 340
      packages is clean (one non-blocking informational warning left, whose
      suggested-fix message still uses old-style specifiers — cosmetic,
      out of scope).
- [x] Commit, push to `claude/esm-imports-migration-nh462i`, open PR.
