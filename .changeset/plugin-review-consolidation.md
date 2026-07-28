---
'@dxos/plugin-markdown': minor
---

plugin-comments and plugin-versioning merge into plugin-review (one review domain: threads,
suggestions, branches, history), and plugin-markdown becomes review-agnostic: versioning/review
behavior reaches the editor through the new `MarkdownCapabilities.EditorBindingHook` socket, and
the `SuggestionSourcesProvider` slot is removed. Consumers referencing the old plugin packages or
keys (`org.dxos.plugin.comments`, `org.dxos.plugin.versioning`) migrate to `@dxos/plugin-review`
(`org.dxos.plugin.review`).
