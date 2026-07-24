# app-framework — Tasks

## Capability API

- [ ] **Review `useCapability` vs `useCapabilities` selection** — `useCapability` throws when no
  contribution exists, so every optional-capability consumer has drifted to the
  `useCapabilities(...)[0]` / `getAll(...)[0]` idiom (MarkdownArticle `EditorBindingHook`,
  `useSelectionContext` ViewState, markdown `get-selection` handler), which mis-states
  at-most-one semantics. Consider an optional-singleton accessor (`useCapability(cap,
  { optional: true })` or `useCapabilityMaybe`) returning `T | undefined`, plus a dev warning
  when contributions > 1; then migrate the `[0]` sites.
