# Decoupling plugin-markdown from plugin-versioning

Goal: plugin-markdown becomes versioning-agnostic — `useVersioning`, `VersionBanner`,
`VersionToolbar`, and the versioning-derived editor/review logic leave the package, and the
`@dxos/plugin-versioning` / `@dxos/versioning` dependencies are removed from plugin-markdown.
This also unblocks moving the markdown-coupled versioning stories/tests (DocumentHistory,
DocumentVersioning, timeline.test) into plugin-versioning without a dependency cycle.

## Status

- **Stage 0 (done, commit `f147243`)**: behavior-preserving extraction. The versioning logic in
  `MarkdownArticle` now lives in two local hooks with narrow interfaces:
  - `useVersionedEditor` — version selection → editor binding: branch/checkpoint/fork subject swap,
    Ambient Suggesting own-branch binding, `branchLoading` gate, snapshot `editorKey`,
    `effectiveViewMode`.
  - `useReviewExtensions` — review affordances: Accept/Reject collaboration ops, ambient
    multi-author overlay + sources, author colours, own `trackChanges`, `suggestChanges`,
    compare/diff overlay.
  Verified: build/lint green, node suite unchanged (27 passed), TimeTravel story play test passes
  live against the refactored container.

## Direction (per review note)

**Reference model: plugin-comments.** It contributes its CodeMirror extension to the editor through
`MarkdownCapabilities.ExtensionProvider` — markdown owns the *socket*, comments owns the *plug*.
plugin-versioning should relate to plugin-markdown the same way. The dependency then inverts:
versioning depends on markdown's capability surface (or a neutral one), markdown knows nothing of
versioning.

## Stages

### Stage 1 — widen the ExtensionProvider socket

The current `ExtensionProvider` props (`document`, `viewMode`, `reviewBranch`, `branchText`,
`suggestionBranch`, `showComments`) already leak versioning concepts. Replace the versioning-typed
fields with a neutral contract:

- `subjectKey: string` — opaque per-surface binding key (today: main/branch/snapshot editor key).
- `context: Record<string, unknown>` (or a typed, extensible struct) that contributors and the
  binding provider (stage 2) negotiate — versioning puts `reviewBranch`/`suggestionBranch` there;
  comments reads them without markdown mediating the names.

### Stage 2 — an EditorBindingProvider capability (the subject swap moves out)

`useVersionedEditor` decides *what object the editor binds to*. Generalize it as a markdown-owned
capability (mirroring ExtensionProvider):

```ts
// MarkdownCapabilities.EditorBindingProvider — contributed by plugin-versioning.
type EditorBindingProvider = (props: { object; viewMode }) => {
  editorObject; initialValue; editorKey; effectiveViewMode; loading: boolean;
  context: Record<string, unknown>; // e.g. { reviewBranch, suggestionBranch, ambient, policy }
} | undefined; // undefined = default binding (bind the object itself)
```

- plugin-versioning implements it with the current `useVersionedEditor` body (it owns
  `useVersioning`, `Branch.bind`, the render policy, review modes).
- `MarkdownArticle` calls providers in contribution order, first non-undefined wins, falls back to
  the plain binding. Zero providers = a version-less editor (Text-only hosts, stories).
- Note: the provider is a *hook-shaped* contribution (it uses state/effects). Precedent exists —
  `SuggestionSourcesProvider` is already a contributed React component. Contribute it as a custom
  hook the container calls via a stable wrapper component, or as a component that renders nothing
  and reports through a callback (the SuggestionSourcesProvider pattern).

### Stage 3 — review extensions move to plugin-versioning

`useReviewExtensions` output is (a) plain CM extensions and (b) live-reconfigured overlays.
- (a) `suggestChanges` / `trackChanges` become an ordinary `ExtensionProvider` contribution from
  plugin-versioning (exactly the plugin-comments pattern), reading its inputs from the stage-2
  binding `context`.
- (b) the compare overlay + ambient suggestions overlay need the live `EditorView` for compartment
  reconfiguration. Markdown already exposes the view registry (`MarkdownCapabilities.EditorViews`)
  and renders contributed components inside `Editor.Root` (SuggestionSourcesProvider). Add a
  markdown-owned `EditorOverlayProvider` slot: contributed components rendered inside
  `Editor.Root` that receive the editor context — versioning contributes `CompareOverlay` and
  `SuggestionsOverlay` (moved wholesale).

### Stage 4 — toolbar/banner and the view-mode dropdown

- `VersionToolbar` / `VersionBanner` move to plugin-versioning, surfaced through the existing
  contributed-surface mechanism (a companion/toolbar Surface filtered on the markdown article), or a
  markdown `ToolbarSlot` capability if surface roles don't fit.
- The review-mode entries in the view-mode dropdown already arrive via
  `MarkdownCapabilities.ViewModeExtension` (contributed) — only `mode`/`setMode` plumbing moves
  behind the stage-2 context.

### Stage 5 — cleanup and relocation

- Remove `useVersioning`, `VersionBanner`, `VersionToolbar`, `useVersionedEditor`,
  `useReviewExtensions`, `history-provider`, `anchor-sort`(versioning parts) from plugin-markdown;
  drop `@dxos/plugin-versioning` + `@dxos/versioning` from its package.json.
- Move `DocumentHistory.stories`, `DocumentVersioning.stories`, `timeline.test` into
  plugin-versioning (now cycle-free; they exercise markdown *through* versioning's dev-deps, or are
  rewritten against a neutral versioned host like the new ObjectHistory story).

## Risks

- Hook-shaped capability contributions (stage 2) are the novel piece; the SuggestionSourcesProvider
  precedent covers it but the ergonomics deserve a spike first.
- `editorKey` remount semantics are load-bearing (automerge rebind loses scroll/selection); the
  provider contract must keep the key rules exactly as documented in `useVersionedEditor`.
- The `branchLoading` gate is a data-safety invariant (edits must never land on main while a branch
  binding resolves) — it must survive the capability hop.
