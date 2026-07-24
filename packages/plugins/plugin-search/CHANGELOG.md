# @dxos/plugin-search

## 0.11.0

### Minor Changes

- e510f3b: Full-text search across a space in the search plugin — ranked, highlighted results backed by the ECHO FTS index, plus a new `SearchResultList`. The mailbox filter now searches messages by subject, sender/recipients, and plain/markdown body (never raw HTML) and shows a best-match highlighted snippet; the query is debounced to avoid re-rendering the list on each keystroke. Shared match/snippet utilities (`computeMatchSpans`, `buildSnippet`, `Highlighted`) moved to `@dxos/react-ui-search`.

### Patch Changes

- Updated dependencies [4e64123]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [a77e1a2]
- Updated dependencies [eec72c5]
- Updated dependencies [e510f3b]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [6439417]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [aea1e6e]
- Updated dependencies [717edc0]
- Updated dependencies [4df6cf3]
- Updated dependencies [96109be]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [a49131a]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
