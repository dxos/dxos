---
branch: agent/mika/5fe3bfb8b3f1
commit: bd0f26da33c8291d247237eca5580abffb08ba6b
base: 78e96da88ffa095db1c8aa61be2e709c76f09945
mode: pr-only
createdAt: 2026-11-05T15:43:51.238Z
isFinalized: true
groups: 101
rules: [catalog-is-dependency-source-of-truth, consistent-field-and-list-ordering, no-pointless-indirection]
reviewId: bd0f26da33
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bd0f26da33-1 - resolved - consistent-field-and-list-ordering - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:589
- bd0f26da33-2 - resolved - catalog-is-dependency-source-of-truth - packages/ui/react-ui-assistant/package.json:56
- bd0f26da33-3 - resolved - no-pointless-indirection - packages/ui/react-ui-assistant/src/renderer.test.ts:210:7

## Issues

# WARN bd0f26da33-1 consistent-field-and-list-ordering `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:589`

`showTokens` is a data prop added after the callback `onViewUsage` in `ChatThreadProps` (and in the destructuring), interleaving callbacks with data members. Move `showTokens` above `onViewUsage` so callbacks stay grouped last, as in `ChatThreadRootProps`.

# WARN bd0f26da33-2 catalog-is-dependency-source-of-truth `packages/ui/react-ui-assistant/package.json:56`

`tokenx` is added with a literal `"^1.3.0"` range directly in this package.json instead of through the workspace catalog (`pnpm-workspace.yaml` has no `tokenx` entry), creating a second place that can drift from `@dxos/ai`'s identical pin. Add `tokenx` to the catalog and reference it here as `"catalog:"` (rule: catalog-is-dependency-source-of-truth).

# WARN bd0f26da33-3 no-pointless-indirection `packages/ui/react-ui-assistant/src/renderer.test.ts:210:7`

`renderUserTokens` is a single-use helper called from exactly one assertion, and it just wraps `markdown(createRenderer('normal', { showTokens: true })(message))` (the name also hides that it is the generic labelled renderer). Inline the call at its one use site per the no-pointless-indirection rule.
