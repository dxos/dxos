# plugin-review: consolidating comments + versioning

Decision (2026-07-24, discussed in-session): merge `plugin-comments` and `plugin-versioning` into a
single `plugin-review`, executed **in PR #12333** on top of the markdown↔versioning inversion.

## Rationale

- comments → versioning is already a hard dependency at both levels (package.json + imports); every
  recent feature (suggestions, ambient review, branch-scoped threads, review modes) lives in the
  intersection. A suggestion IS a `Branch(kind:'suggestion')` rendered as a comment thread;
  accept/reject IS merge/discard.
- The package boundary is the _cause_ of the socket sprawl: `SuggestionSourcesProvider`, the
  review-context `extensionProps` switchboard, and `ReviewRenderPolicy` exist only to route data
  across it. The merge turns all three into function calls / module state.
- Review is an inherent capability of the ECHO/automerge data model (core branches are
  object-generic); other comment receivers (sheet, sketch) could gain review with different UI
  surfaces — so a common review core with per-media adapters is the right shape.
- Co-locating comments+review logic and UI enables teasing out UI variance (e.g. a
  `react-ui-review`) later, once a second media surface exists.

## Layering

1. **ECHO core** — object-generic branching/heads/registry (exists, untouched).
2. **`@dxos/versioning`** — review model (branch/version/suggestion metadata, lifecycle, merge).
   Later arc: per-media diff seam (text diff becomes the first implementation, not the definition).
3. **`plugin-review`** — review state (view aspect), policies, thread/suggestion/timeline UI, and
   per-media adapters as internal modules (markdown today; sheet/sketch later, each against its own
   editor's socket).
4. **Editor plugins** — neutral binding/extension sockets only; zero review vocabulary.

## Disposition

`git mv packages/plugins/plugin-comments → packages/plugins/plugin-review` (larger package keeps
history), rename identity, then fold plugin-versioning's src in:

| Source                                                                           | Destination                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| comments src (threads, suggestions, operations, skills, state)                   | stays (now `plugin-review/src`)                                                                               |
| versioning `types/` (viewAspect, selection, ReviewMode, HistoryProvider, policy) | `src/types/` — namespace renamed `VersioningCapabilities` → `ReviewCapabilities`                              |
| versioning `containers/ObjectHistory`                                            | `src/containers/ObjectHistory`                                                                                |
| versioning `model/` (timeline)                                                   | `src/model/`                                                                                                  |
| versioning `src/markdown/` (binding hook, banners, version-diff, stories)        | `src/markdown/` — merged with comments' `capabilities/markdown-extension.ts` into ONE markdown adapter module |
| versioning capabilities (app-graph-builder, react-surface, state)                | `src/capabilities/` under history-/review- prefixed names (comments' files keep names)                        |
| both plugin definitions (browser/node/workerd)                                   | one `ReviewPlugin` per variant, module union                                                                  |
| both translations                                                                | one file under the review key                                                                                 |
| both PLUGIN.mdl                                                                  | one, rewritten after implementation settles                                                                   |

Kept as-is: `@dxos/versioning` SDK; app-toolkit registries (`CommentConfig`, `AnchorResolver`,
`AnchorSort` — contributors sheet/bookmarks/table/sketch/video unaffected); `@dxos/react-ui-thread`;
markdown's sockets. `CommentCapabilities` keeps its name (accurate domain vocabulary); capability
ids re-key automatically via the new meta key — all references go through exported objects.

## Dependents to re-point (verified)

- `composer-app` — plugin-defs full/core/minimal (two entries → `ReviewPlugin()`), `getDefaults`
  keys, package.json, vite `optimizeDeps` brace glob.
- `devtools/cli` — `util/skills.ts` (`CommentOperationHandlerSet`, `CommentSkill`).
- `plugin-blogger` — `CommentsArticle` import.
- `plugin-sheet` — `CommentOperation` from `/types` (`integrations/thread-ranges.ts`).
- `stories-assistant` — `Documents.stories`, `CommentsModule`/`HistoryModule`, package.json.
- `plugin-thread` — `dx.config.ts` glob reference.

## Also folded into this PR

- **BindingBoundary hardening** (markdown): stable per-function key (WeakMap-minted id) instead of
  `'contributed' | 'default'`; dev warning when >1 `EditorBindingHook` contribution; contract
  sentence in the capability JSDoc ("contributions are app-lifetime; swaps remount").
- `SuggestionSourcesProvider` bridge collapses to a direct import inside the merged markdown
  adapter; markdown's `SuggestionSourcesProvider` capability slot is removed if no other consumer
  remains.

## Out of scope (later arcs)

- Per-media diff seam in `@dxos/versioning`; sheet/sketch adapters; `react-ui-review` extraction.
- Shrinking markdown's `ExtensionProvider` props (`reviewBranch`/`branchText`/`suggestionBranch`/
  `showComments`) behind a review-context CM facet — still desirable, but no longer urgent once
  both ends live in one package; revisit with the second media adapter.
- `useCapabilityMaybe` in app-framework (tracked in `packages/sdk/app-framework/TASKS.md`).

## Risks

- Plugin-key churn: enabled-plugin user settings keyed by old ids; users re-enable once (no
  migration written for this PR).
- Big-PR review burden: mitigated by move-only commits (`git mv`) separated from edit commits, and
  the full verification battery (builds, lints, node suites, DocumentVersioning story battery,
  module-structure check) at the end.
