# app-framework — Tasks

## Surface

- [ ] **A lazily-activated surface loses the first render to a catch-all.** Measured 2026-08-23 in
      Composer: opening a feed rendered plugin-space's `recordArticle` at `04:18:17.19` and
      plugin-magazine's `feedArticle` at `04:18:18.25` — **1.06s of the wrong surface**, first
      navigation only.

      `Surface` fires `SurfacesRequested(role)` on mount, which is what loads role-gated modules
                                              (`SurfaceComponent.tsx`). A module declaring `roles` is therefore absent on that first render,
                                              so an eager `Position.last` catch-all matching `Obj.isObject` claims the slot and is replaced a
                                              second later. It reads as a flash of unrelated UI: `RecordArticle` is a properties form plus a
                                              Masonry, so a feed plank briefly shows a form and a grid of related objects.

                                              Fix: `SurfaceManager` tracks `#requestedRoles` (demand claimed) but has no notion of activation
                                              SETTLED. Add a per-role settled signal, flipped in the `Effect.onExit` `requestSurfaces`
                                              already has, and have `SurfaceComponent` render its `placeholder` — which the plank already
                                              passes — while a role's first activation is in flight.

                                              Narrower and safer variant: hold only FALLBACK matches (`Position.last`) while the role is
                                              unsettled, and render specific matches immediately. That fixes exactly this class and cannot
                                              strand a plank that has a real match.

                                              Hazard either way: a role whose activation never settles must not strand the placeholder.
                                              `onExit` covers success and failure, but the first render happens before the effect runs — so
                                              either the request moves into render, or that first frame still shows the fallback.

## Capability API

- [ ] **Review `useCapability` vs `useCapabilities` selection** — `useCapability` throws when no
      contribution exists, so every optional-capability consumer has drifted to the
      `useCapabilities(...)[0]` / `getAll(...)[0]` idiom (MarkdownArticle `EditorBindingHook`,
      `useSelectionContext` ViewState, markdown `get-selection` handler), which mis-states
      at-most-one semantics. Consider an optional-singleton accessor (`useCapability(cap,
{ optional: true })` or `useCapabilityMaybe`) returning `T | undefined`, plus a dev warning
      when contributions > 1; then migrate the `[0]` sites.
