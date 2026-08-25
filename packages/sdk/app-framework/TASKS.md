# app-framework — Tasks

## Surface

- [x] **A lazily-activated surface loses the first render to a catch-all.** Measured 2026-08-23 in
      Composer: opening a feed rendered plugin-space's `recordArticle` at `04:18:17.19` and
      plugin-magazine's `feedArticle` at `04:18:18.25` — **1.06s of the wrong surface**, first
      navigation only. Tracked as #12717.

`Surface` fires `SurfacesRequested(role)` on mount, which is what loads role-gated modules
(`SurfaceComponent.tsx`). A module declaring `roles` is therefore absent on that first render, so an
eager `Position.last` catch-all matching `Obj.isObject` claims the slot and is replaced a second
later. It reads as a flash of unrelated UI: `RecordArticle` is a properties form plus a Masonry, so a
feed plank briefly shows a form and a grid of related objects.

FIXED with the narrow variant: `SurfaceManager.pendingAtom(role)` reports whether a module gated on
the role's demand event has yet to activate (derived from the plugin manager's `modules`/`active`
atoms, boolean-valued so it re-renders subscribers only when it flips), and `SurfaceComponent`
withholds `Position.last` matches while it is true — rendering the placeholder instead. Specific
matches are never held, so a surface with real content can never be delayed by this.

The predicate reads module state directly rather than tracking an activation-settled signal, so it is
correct on the FIRST render — before the demand effect has run — which the settled-signal variant
could not be. The hazard (a role that never settles stranding the placeholder) is bounded by the
manager itself: a plugin that fails, including by exceeding the module timeout, is excluded from
`modules` and auto-disabled, so the hold lifts.

## Capability API

- [ ] **Review `useCapability` vs `useCapabilities` selection** — `useCapability` throws when no
      contribution exists, so every optional-capability consumer has drifted to the
      `useCapabilities(...)[0]` / `getAll(...)[0]` idiom (MarkdownArticle `EditorBindingHook`,
      `useSelectionContext` ViewState, markdown `get-selection` handler), which mis-states
      at-most-one semantics. Consider an optional-singleton accessor (`useCapability(cap,
{ optional: true })` or `useCapabilityMaybe`) returning `T | undefined`, plus a dev warning
      when contributions > 1; then migrate the `[0]` sites.
