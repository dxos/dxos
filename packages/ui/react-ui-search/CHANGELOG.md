# @dxos/react-ui-search

## 0.11.0

### Minor Changes

- e510f3b: Full-text search across a space in the search plugin — ranked, highlighted results backed by the ECHO FTS index, plus a new `SearchResultList`. The mailbox filter now searches messages by subject, sender/recipients, and plain/markdown body (never raw HTML) and shows a best-match highlighted snippet; the query is debounced to avoid re-rendering the list on each keystroke. Shared match/snippet utilities (`computeMatchSpans`, `buildSnippet`, `Highlighted`) moved to `@dxos/react-ui-search`.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [4df6cf3]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/react-hooks@0.11.0
