# @dxos/codemorph

Codemods for large refactors.

- `src/migrate-to-nested-source.ts` converts packages to the nested `exports.source` condition; usage in its header.

The react-ui Next migration codemods ran at the cut-over and were then removed; what they did is recorded in
`packages/ui/react-ui/docs/archive/MIGRATION-CODEMODS.md`, and the code is in git history.
