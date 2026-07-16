---
'@dxos/react-ui-search': minor
'@dxos/plugin-search': minor
---

Full-text search across a space in the search plugin — ranked, highlighted results backed by the ECHO FTS index, plus a new `SearchResultList`. The mailbox filter now searches messages by subject, sender/recipients, and plain/markdown body (never raw HTML) and shows a best-match highlighted snippet; the query is debounced to avoid re-rendering the list on each keystroke. Shared match/snippet utilities (`computeMatchSpans`, `buildSnippet`, `Highlighted`) moved to `@dxos/react-ui-search`.
