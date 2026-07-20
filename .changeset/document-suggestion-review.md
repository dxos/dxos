---
'@dxos/ui-editor': patch
'@dxos/plugin-markdown': patch
---

Document versioning: Google-Docs-style suggestion review.

- **@dxos/ui-editor**: new `suggestChanges` extension (inline per-change accept/reject over a proposal) plus word-level `diffHunks`; the `comments` / `diff` / `suggest` review extensions are grouped under a new `review/` folder (package barrel exports unchanged).
- **@dxos/app-framework**: `NamePopover` moved to `@dxos/app-framework/ui`, decoupled from translations via a `submitLabel` prop.
- **@dxos/plugin-markdown**: branch/merge/checkpoint exposed as agent skill tools; a `suggest` diff-view mode; the compare/diff overlay is reconfigured through a CodeMirror `Compartment` so toggling Compare no longer remounts the editor (rebinding automerge / losing selection).
- **@dxos/plugin-space**: `NamePopover` removed from `@dxos/plugin-space/components` (relocated to `@dxos/app-framework/ui`).
