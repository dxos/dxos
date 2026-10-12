---
branch: dm/magical-gates-8agst6
commit: 58a928b7b5fb62d8e1bb030582b94363cdd8d5bd
base: fd091316c28800511069fa4c3580aea9a183d245
mode: fast
createdAt: 2026-10-11T08:28:50.948Z
isFinalized: true
groups: 404
rules: [bounded-live-state, business-logic-out-of-ui, declare-optional-services-with-noop-layers, deprecated-tag-must-be-accurate, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, jsdoc-non-obvious-identifiers, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-sleep-in-test, no-styling-wrapper-divs, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 58a928b7
---

_11 error(s), 21 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 58a928b7-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/echo/blob/src/hosted/replicator.ts:110
- 58a928b7-2 - ignored - namespace-export-with-internal-hiding - packages/core/echo/blob/src/index.ts:1
- 58a928b7-3 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:490
- 58a928b7-4 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1015
- 58a928b7-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93
- 58a928b7-6 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:442
- 58a928b7-7 - ignored - no-casts - packages/core/mesh/edge-client/src/base-http-client.ts:221
- 58a928b7-8 - ignored - deprecated-tag-must-be-accurate - packages/core/mesh/edge-client/src/base-http-client.ts:448
- 58a928b7-9 - ignored - no-sleep-in-test - packages/core/mesh/edge-client/src/edge-client.test.ts:202
- 58a928b7-10 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.test.ts:387
- 58a928b7-11 - ignored - no-casts - packages/core/mesh/edge-client/src/edge-http-client.ts:872
- 58a928b7-12 - ignored - flat-layer-composition - packages/core/mesh/edge-client/src/edge-http-client.ts:872
- 58a928b7-13 - ignored - jsdoc-non-obvious-identifiers - packages/core/protocols/src/edge/edge.ts:198
- 58a928b7-14 - ignored - no-casts - packages/core/protocols/src/edge/edge.ts:477
- 58a928b7-15 - ignored - errors-extend-base-error - packages/core/protocols/src/edge/errors.ts:71
- 58a928b7-16 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:133
- 58a928b7-17 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34
- 58a928b7-18 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:90
- 58a928b7-19 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasFrameNodeView.tsx:50
- 58a928b7-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-canvas/src/containers/CanvasArticle/NodeTypePlugin.stories.tsx:44
- 58a928b7-21 - ignored - no-sleep-in-test - packages/plugins/plugin-canvas/src/model/store.test.ts:210
- 58a928b7-22 - ignored - no-casts - packages/sdk/client-protocol/src/service-rpc.ts:269
- 58a928b7-23 - resolved - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/blobs/blob-store-service.ts:19
- 58a928b7-24 - ignored - bounded-live-state - packages/sdk/client-services/src/internal/blobs/local-blob-store.ts:36
- 58a928b7-25 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:81
- 58a928b7-26 - ignored - no-casts - packages/sdk/client/src/client/client.ts:310
- 58a928b7-27 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:574
- 58a928b7-28 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/icons/ComposerIdent.stories.tsx:356
- 58a928b7-29 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:694
- 58a928b7-30 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:582
- 58a928b7-31 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-canvas/src/hooks/useWheel.ts:7
- 58a928b7-32 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:111

## Issues

# WARN 58a928b7-1 effect-fn-not-hand-wrapped-gen `packages/core/echo/blob/src/hosted/replicator.ts:110`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 110-121 (`const uploadPending = (local: LocalBlobStore, transport: BlobTransport): Effe...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-2 namespace-export-with-internal-hiding `packages/core/echo/blob/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-8 (`export * from './backend.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-3 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:490`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 490-513 (`let updatingAuthScope = false;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-4 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1015`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1015-1038 (`if (initialValue instanceof Uint8Array) {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-5 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:93`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 93-104 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-6 no-casts `packages/core/echo/echo-host/src/automerge/subduction-migrations/subduction-migrations.test.ts:442`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 442-453 (`const row = captured.fragments.get(`${sedimentreeHex}/${fragment.head}`)!;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-7 no-casts `packages/core/mesh/edge-client/src/base-http-client.ts:221`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 221-232 (`throw processingError!;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-8 deprecated-tag-must-be-accurate `packages/core/mesh/edge-client/src/base-http-client.ts:448`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 448-459 (`const createRetryHandler = ({ retry }: HttpRequestArgs) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-9 no-sleep-in-test `packages/core/mesh/edge-client/src/edge-client.test.ts:202`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 202-213 (`await sleep(1_000);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-10 no-casts `packages/core/mesh/edge-client/src/edge-http-client.test.ts:387`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 387-398 (`const fetchMock = vi.fn(async (input: any, _init?: RequestInit) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-11 no-casts `packages/core/mesh/edge-client/src/edge-http-client.ts:872`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 872-895 (`public async _fetch<T>(url: URL, _args: { method: string }): Promise<T> {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-12 flat-layer-composition `packages/core/mesh/edge-client/src/edge-http-client.ts:872`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 872-895 (`public async _fetch<T>(url: URL, _args: { method: string }): Promise<T> {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-13 jsdoc-non-obvious-identifiers `packages/core/protocols/src/edge/edge.ts:198`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 198-212 (`export type JoinSpaceRequest = {`, location confidence 0.09). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-14 no-casts `packages/core/protocols/src/edge/edge.ts:477`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 477-493 (`const MAX_ERROR_DEPTH = 3;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-15 errors-extend-base-error `packages/core/protocols/src/edge/errors.ts:71`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.83. The likeliest place is lines 71-83 (`export class EdgeAuthChallengeError extends EdgeCallFailedError {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-16 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:133`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 133-144 (`const useDraftContext = ({ db, draft, registry, pluginManager }: UseDraftCont...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 34-49 (`const addNotes = (count: number) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-18 extract-non-rendering-logic-from-component `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasArticle.tsx:90`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 90-101 (`},`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-19 toolbars-are-menu-actions `packages/plugins/plugin-canvas/src/containers/CanvasArticle/CanvasFrameNodeView.tsx:50`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 50-61 (`export const CanvasFrameToolbar = ({ node, onOpen }: NodeViewProps) => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-20 no-styling-wrapper-divs `packages/plugins/plugin-canvas/src/containers/CanvasArticle/NodeTypePlugin.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 44-57 (`const TaskNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-21 no-sleep-in-test `packages/plugins/plugin-canvas/src/model/store.test.ts:210`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 210-221 (`await new Promise((resolve) => setTimeout(resolve, 100));`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-22 no-casts `packages/sdk/client-protocol/src/service-rpc.ts:269`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 269-281 (`export const makeClientServicesRpcFromRouter: Effect.Effect<`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-23 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/blobs/blob-store-service.ts:19`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.91. The likeliest place is lines 19-30 (`export const BlobStoreServiceLayer: Layer.Layer<BlobStoreService.Tag, never, ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-24 bounded-live-state `packages/sdk/client-services/src/internal/blobs/local-blob-store.ts:36`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.87. The likeliest place is lines 36-47 (`export const makeLocalBlobStore: Effect.Effect<LocalBlobStore, never, SqlClie...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-25 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:81`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 81-92 (`export const registerReplicator = <Self>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-26 no-casts `packages/sdk/client/src/client/client.ts:310`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 310-333 (`async diagnostics(options: JsonKeyOptions = {}): Promise<any> {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-27 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:574`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 574-597 (`this._statusStreamCleanup = subscribeStream(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-28 no-styling-wrapper-divs `packages/ui/brand/src/components/icons/ComposerIdent.stories.tsx:356`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 356-367 (`const DefaultStory = (props: StoryArgs) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-29 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:694`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 694-717 (`<LabelPart node={node} editing={editing} label={title} />`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-30 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/SceneView.tsx:582`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 582-629 (`linkHoverTimer.current = setTimeout(() => registry.set(atoms.linkHover, undef...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 58a928b7-31 namespace-brand-key-prefixing `packages/ui/react-ui-canvas/src/hooks/useWheel.ts:7`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.86. The likeliest place is lines 7-17 (`export type WheelHandler = (event: WheelEvent, pointer: { x: number; y: numbe...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 58a928b7-32 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 111-122 (`Tile={Tile!}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fd091316c28800511069fa4c3580aea9a183d245`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 32 violations written to fragments, 612 uncertain, 3859 clean, 0 unanswered
- left for an agentic reviewer: 92 batch(es)

```text
requests: 1879 (390 verdicts re-asked with context the model requested)
estimated input tokens: 15572959
billed input tokens: 14864033 (cost $0.6243)
measured chars per token: 3.14
```
