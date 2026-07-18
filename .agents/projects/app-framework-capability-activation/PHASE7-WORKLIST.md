# Phase 7 work-list — capability-dependency migration (inventory 2026-07-16)

Scope: every package calling `Plugin.define(`/`Plugin.addModule(` except migrated
`plugin-client` and app-framework's `plugin-process-manager`. `packages/ui/ui-editor`'s
`ViewPlugin.define(` is CodeMirror API (out of scope). Apps assemble plugins only
(`composer-app/src/plugin-defs.tsx`). Every plugin: `src/plugin.ts` is the lazy meta stub
(never touched); real definitions in `src/<Name>Plugin.{ts,tsx}` (+ `.node.ts`/`.workerd.ts`).

No package outside the two references has adopted requires/provides yet (~89 to migrate).

## Custom ActivationEvent classification

RUNTIME OCCURRENCE (stay events):

- `ClientEvents.IdentityCreated` — fired by `plugin-client/src/operations/create-identity.ts:26`
- `ClientEvents.SpacesReady` — fired by client.ts spaces subscription
- `SpaceEvents.SpaceCreated` — fired by `plugin-space/src/operations/create.ts:54` AND `plugin-onboarding/src/capabilities/default-content.ts:50`
- `SpaceEvents.TypeAdded` — fired by `plugin-space/src/operations/add-type.ts:31`
- `ScriptEvents.SetupCompiler` — fired imperatively by `plugin-script/src/hooks/useCompiler.ts:21` (on-demand compiler load)

ORDERING-ONLY (replace with requires/provides; keep exported+deprecated until Phase 8):

- `ClientEvents.ClientReady`, `ClientEvents.SetupMigration` (compat bridges already), `ClientEvents.SetupSchema` (DEAD — never fired; drop when touched)
- `SpaceEvents.PersonalSpaceReady` (consumed by plugin-onboarding), `SpaceEvents.SetupSettingsPanel`
- `AttentionEvents.AttentionReady` → `requires: [AttentionCapabilities.Attention]` (consumers: space, markdown, trip, commerce, inbox, ibkr, magazine)
- `AssistantEvents.SetupAiServiceProviders` (also consumed by plugin-native)
- `WnfsEvents.DependenciesReady`
- `ObservabilityEvents.ClientReadyEvent` + inline string-duplicate of IdentityCreated in `ObservabilityPlugin.ts:70` (decoupling hack — see special cases)
- `*Events.StateReady`/`SettingsReady` family (createStateEvent/createSettingsEvent): deck, navtree, simple-layout, spotlight, inbox, map, meeting, files, observability — textbook `provides: [XCapabilities.State|Settings]` conversions
- `MarkdownEvents.SetupExtensions` — fired via firesBefore off plugin-markdown's surface module (`MarkdownPlugin.tsx:508`); 7 consumer packages (see Batch 5) — migrate plugin-markdown first, land consumers together

Dead code: `plugin-transformer/src/TransformerPlugin.tsx:18-22` commented-out module (delete);
`plugin-deck/src/DeckPlugin.ts:59-62` commented-out module (delete).

## (a) Foundational wave (ordered)

1. plugin-attention — moderate. 4 modules; `attention` (Startup, firesAfter AttentionReady, contributes Attention+ViewState, gets AtomRegistry); Keyboard on allOf(AppGraphReady, AttentionReady).
2. plugin-graph — moderate. One module (Startup, firesBefore SetupAppGraph, firesAfter AppGraphReady). Only repo user of `Capability.atomByModule` — review keying.
3. plugin-theme — moderate. 2 raw Startup modules firesBefore SetupTranslations (gates every plugin's translations — provides must be right).
4. plugin-settings — mechanical (4 helpers, no raw modules).
5. plugin-status-bar — mechanical (surface + translations).
6. plugin-progress — mechanical/moderate. progress-registry (Startup, firesAfter ProgressRegistryReady), SetupReactSurface module.
7. Layout tier (mutually exclusive at runtime; all fire LayoutReady): plugin-deck (careful — SettingsReady/StateReady chains, 11 gets, graph-builder connector reads at :54,:69,:93), plugin-simple-layout (moderate), plugin-spotlight (moderate). Include plugin-testing's StorybookPlugin (fires LayoutReady for storybook).
8. plugin-navtree — moderate (state on LayoutReady → StateReady; allOf(AppGraphReady,...) modules).
9. plugin-space — careful, LAST in wave. Modules at SpacePlugin.ts:52-158; SpacesReady module has widest fan-in: allOf(ProcessManagerReady, LayoutReady, AppGraphReady, AttentionReady, SpaceEvents.StateReady, ClientEvents.SpacesReady) → activatesOn ClientEvents.SpacesReady + requires the rest as capabilities. IdentityCreated module stays event-mode (fires PersonalSpaceReady via compatFires until onboarding migrates). Graph-builder connector reads in extensions/spaces.ts:189-211,269-282.
10. plugin-registry — moderate.

## (b) Leaf batches

Batch 1 (mechanical, pure content-type; helpers only): board, conductor, explorer, outliner, spacetime, stack, template, voxel, zen.
Batch 2 (kanban family): kanban, table (`on-type-added` stays event-mode on SpaceEvents.TypeAdded), sheet, sketch, game, map, map-solid.
Batch 3 (connectors; SetupConnectors module → provides connector capability): bluesky, discord, github, linear, slack, trello, heygen, ideogram, freeq, duffel.
Batch 4 (games+): chess, chess-com, tictactoe, osrm, mermaid (SetupExtensions consumer — with Batch 5), ibkr (graph-builder atom pattern :21-33).
Batch 5 (MarkdownEvents.SetupExtensions consumers — AFTER plugin-markdown): comments, file, mermaid, native-filesystem (already uses Capability.atom — verify fallback), presenter, sheet, transcription. plugin-markdown itself: convert to multi capability (e.g. MarkdownCapabilities.Extension) first.
Batch 6 (communication): thread, calls, meeting (careful — connector reads :78-227, Atom.family :30-39), inbox (careful — 9 createExtension blocks, resolver read :99, Atom.family :144-147).
Batch 7 (tools): code (imperative Plugin.activate(SetupPluginAssets) in graph-builder :31 — special case), sequencer, pipeline, studio, doctor, sidekick, crm, sandbox, script (SetupCompiler stays runtime event), transformer.
Batch 8 (platform variants): native, native-filesystem, crx, pwa, wnfs, iroh-beacon.
Batch 9 (shell/dev/onboarding): devtools, debug, testing (layout-role), onboarding (default-content stays event-mode on PersonalSpaceReady; fires SpaceCreated imperatively), support (on-space-created stays event-mode on SpaceCreated).
Batch 10 (misc): payments, preview, search, trip (atom pattern :45-56), commerce, magazine (atom pattern :26-74), sample, video, assistant (careful — see special cases), brain (LayerSpec in fact-store.ts:85-99).
Scaffolding (mechanical, last): app-toolkit playground plugins, stories-assistant/brain/inbox, story-modules.

## (c) Special cases

1. plugin-assistant — careful: 3 LayerSpec files (ai-context:22, agent-service:39, ai-service:49 — follow plugin-routine layer-specs idiom); workerd variant much smaller (keep specs consistent); graph-builder connector reads :99,:141-142 (one hybrid `get(yield* Capability.get(State))` → collapse to one atom read).
2. plugin-brain — LayerSpec mini-routine (fact-store.ts:85-99).
3. plugin-observability — architectural decision: keep string-decoupled events vs take a real requires edge on client capabilities.
4. plugin-code — imperative `Plugin.activate(SetupPluginAssets)` inside graph extension (:31): likely removable once assets are dependency-provided.
5. plugin-testing — fourth layout provider (LayoutReady).
6. Markdown SetupExtensions fan-out — coordinate (see Batch 5).
7. Graph-extension get-inside-connector/resolver files (MUST become Capability.atom reads with empty fallback): assistant(:99,141-142), deck(:54,69,93), ibkr(:21-33), inbox(:99,144-147), magazine(:26-74), meeting(:78-227), space(extensions/spaces.ts:189-211,269-282 — CreateAtom.fromObservable variant), trip(:45-56).
8. LayerSpec providers: routine (done), client (done), assistant, brain.
9. Workerd/node drift list (keep module ids + specs in sync): assistant, comments, inbox, kanban, magazine, markdown, map, sample, sequencer, sheet, table, thread, transcription, routine. Pure no-op workerd files: calls, debug, devtools, map-solid, presenter, wnfs.
