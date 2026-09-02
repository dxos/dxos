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
- [x] Drive CI to green (user instruction: "keep spinning until ci passes").
      Root-caused and fixed FOUR real regressions the migration exposed,
      beyond the three oxlint rules above: 1. `packages/common/protobuf-compiler/src/parser/substitutions-parser.ts`
      — `ts-morph`'s vendored TypeScript (~4.8) predates
      `allowImportingTsExtensions`, so it rejected a `substitutions.ts`
      file's own `.ts`-extensioned relative imports outright, silently
      poisoning every substitution to raw wire-format types. Fixed via a
      `RealFileSystemHost` subclass (`SubstitutionsFileSystemHost`) that
      rewrites `.ts`/`.tsx` to `.js`/`.jsx` only in ts-morph's isolated
      parse, never on disk. 2. `.config/knip.ts` — knip's traversal does not credit a dynamic
      `import()` whose specifier carries an explicit extension (e.g.
      `Capability.lazyModule(..., () => import('./Debug.tsx'))`), so a
      dependency solely reached that way (`@dxos/react-ui-syntax-highlighter`
      via `app-toolkit`) read as unused. Added to the existing
      `TRAVERSAL_MISSED` allowlist (same mechanism already used for the
      analogous barrel `export *` gap). 3. `packages/apps/composer-app/vite.config.ts` — the `DX_PLUGIN_SET`
      Vite alias matched only the bare `./plugin-defs` specifier via an
      anchored regex; `main.tsx`'s import became `./plugin-defs.tsx`,
      so the alias silently stopped firing and a "production" build
      shipped all 106 plugins instead of the curated 30 (confirmed via
      `composer-app:check-plugin-set`, "73 unexpected" → 0). Widened the
      regex to match both forms. 4. Same three oxlint rules from above had a SECOND, distinct bug:
      extension-unaware path-depth/name derivation. `dxos-subpath-exports`
      counted `./dir/index.ts` as one level deeper than the old bare
      `./dir` (false `nestedPathExport`, caught on `plugin-discord:lint`);
      `import-as-namespace` derived the namespace `index` instead of the
      directory name for the same specifier shape; `dxos-package-imports`'s
      self-import regex no longer matched a barrel's own extensioned
      re-export. Fixed all three; full `moon exec :lint` (340 packages) and
      `:build :test-types` are clean.
      Also merged `main` twice (it moved ~20 commits during this PR,
      including a large `agent-feed-messages` feature landing the exact
      queue-while-processing UX this session had built independently and
      more simply — dropped the local version in favor of theirs, see the
      registry entry) — each merge re-ran the codemod on the newly-pulled
      content to keep the explicit-extension convention. `Check / check`
      and `Model Fixture` are now green. Only `Check / test shard=1`
      remains red, root-caused via two clean full local `:test` runs to a
      single PRE-EXISTING flaky test
      (`echo-host` `automerge-repo-subduction-policy.test.ts`
      "authorizeFetch fires on BOTH proactive push and explicit fetch
      (empirical)"; the file documents its own flakiness and git log shows
      only this branch's extension-only touch) — documented in a PR comment
      since Depot-hosted jobs can't be re-run from here. NEXT: watch PR
      #12893 for shard=1 to go green on the next push (main is still
      moving) and for review.
