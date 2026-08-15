# Capability environment matrix — drift audit

Generated 2026-08-15T04:17:58.806Z. 36 plugins in scope (hand-maintain a node/workerd `plugin.*` or `capabilities/*` variant). Total mismatch flags: **26**.

## Worst offenders

| plugin           | mismatch flags |
| ---------------- | -------------- |
| plugin-space     | 6              |
| plugin-client    | 4              |
| plugin-assistant | 3              |
| plugin-inbox     | 2              |
| plugin-projects  | 2              |
| plugin-routine   | 2              |
| plugin-connector | 1              |
| plugin-magazine  | 1              |
| plugin-map-solid | 1              |
| plugin-registry  | 1              |
| plugin-tasks     | 1              |
| plugin-thread    | 1              |
| plugin-wnfs      | 1              |

## Byte-identical node/workerd file pairs

| plugin           | kind  | detail                                                                                          |
| ---------------- | ----- | ----------------------------------------------------------------------------------------------- |
| plugin-map-solid | entry | plugin-map-solid/src/plugin.node.ts is byte-identical to plugin-map-solid/src/plugin.workerd.ts |
| plugin-thread    | entry | plugin-thread/src/plugin.node.ts is byte-identical to plugin-thread/src/plugin.workerd.ts       |
| plugin-wnfs      | entry | plugin-wnfs/src/plugin.node.ts is byte-identical to plugin-wnfs/src/plugin.workerd.ts           |

## Orphaned variant files (on disk, not wired via package.json conditions)

| plugin | type | detail |
| ------ | ---- | ------ |
| _none_ |      |        |

## Per-plugin detail

### plugin-assistant (3 flags)

Entries: browser=`plugin-assistant/src/plugin.ts` node=`plugin-assistant/src/plugin.node.ts` workerd=`plugin-assistant/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-assistant/src/capabilities/index.ts` node=`null` workerd=`plugin-assistant/src/capabilities/workerd.ts`

| module                   | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                      |
| ------------------------ | ---------------------- | ------------------- | ---------------------- | -------------------------- |
| AgentHydrator            | Y/Y                    | Y/-                 | ./.                    |                            |
| AgentRuntime             | Y/Y                    | Y/-                 | ./.                    |                            |
| AiContext                | Y/Y                    | Y/-                 | ./.                    |                            |
| AiService                | Y/Y                    | Y/-                 | ./.                    |                            |
| AppGraphBuilder          | Y/Y                    | Y/-                 | ./.                    |                            |
| AssistantState           | Y/Y                    | ./-                 | ./.                    |                            |
| AutomationTemplates      | Y/Y                    | ./-                 | ./.                    |                            |
| CompanionChatProvisioner | Y/Y                    | ./-                 | ./.                    |                            |
| Connector                | Y/Y                    | ./-                 | ./.                    |                            |
| CreateObject             | Y/Y                    | Y/-                 | ./.                    |                            |
| EdgeModelResolver        | Y/Y                    | Y/-                 | ./.                    |                            |
| LocalModelResolver       | Y/Y                    | Y/-                 | ./.                    |                            |
| MarkdownExtension        | Y/Y                    | ./-                 | ./.                    |                            |
| OperationHandler         | Y/Y                    | Y/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |
| ReactSurface             | Y/Y                    | ./-                 | ./.                    |                            |
| Schema                   | Y/Y                    | Y/-                 | Y/Y                    |                            |
| Settings                 | Y/Y                    | ./-                 | ./.                    |                            |
| SkillDefinition          | Y/Y                    | Y/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |
| Toolkit                  | Y/Y                    | Y/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |

### plugin-calls (0 flags)

Entries: browser=`plugin-calls/src/plugin.tsx` node=`plugin-calls/src/plugin.node.ts` workerd=`plugin-calls/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-calls/src/capabilities/index.ts` node=`null` workerd=`null`

| module          | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| --------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder | Y/Y                    | ./-                 | ./-                    |       |
| CallManager     | Y/Y                    | ./-                 | ./-                    |       |
| CallTransport   | Y/Y                    | ./-                 | ./-                    |       |
| ReactRoot       | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface    | Y/Y                    | ./-                 | ./-                    |       |

### plugin-chess (0 flags)

Entries: browser=`plugin-chess/src/plugin.tsx` node=`plugin-chess/src/plugin.node.ts` workerd=`plugin-chess/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-chess/src/capabilities/index.ts` node=`plugin-chess/src/capabilities/node.ts` workerd=`plugin-chess/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| GameVariant      | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SkillDefinition  | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-chess-com (0 flags)

Entries: browser=`plugin-chess-com/src/plugin.tsx` node=`plugin-chess-com/src/plugin.node.ts` workerd=`plugin-chess-com/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-chess-com/src/capabilities/index.ts` node=`plugin-chess-com/src/capabilities/node.ts` workerd=`plugin-chess-com/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder  | Y/Y                    | ./.                 | ./.                    |       |
| CreateObject     | Y/Y                    | Y/Y                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface     | Y/Y                    | ./.                 | ./.                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |

### plugin-client (4 flags)

Entries: browser=`plugin-client/src/plugin.ts` node=`plugin-client/src/plugin.node.ts` workerd=`plugin-client/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-client/src/capabilities/index.ts` node=`plugin-client/src/capabilities/node.ts` workerd=`plugin-client/src/capabilities/workerd.ts`

| module                   | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                                                  |
| ------------------------ | ---------------------- | ------------------- | ---------------------- | ------------------------------------------------------ |
| AccountCache             | Y/Y                    | ./.                 | ./.                    |                                                        |
| AppGraphBuilder          | Y/Y                    | ./Y                 | ./.                    |                                                        |
| Client                   | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| Commands                 | Y/Y                    | Y/Y                 | ./.                    | SPEC_DRIFT_BETWEEN_BARRELS                             |
| HubHttpClient            | Y/Y                    | ./.                 | ./.                    |                                                        |
| LayerSpecs               | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| Migrations               | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| NavigationHandler        | Y/Y                    | ./Y                 | ./.                    | SPEC_DRIFT_BETWEEN_BARRELS                             |
| NavigationTargetLoader   | Y/Y                    | ./.                 | ./.                    |                                                        |
| OperationHandler         | Y/Y                    | Y/Y                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS, SPEC_DRIFT_BETWEEN_BARRELS |
| ReactContext             | Y/Y                    | ./.                 | ./.                    |                                                        |
| ReactSurface             | Y/Y                    | ./.                 | ./.                    |                                                        |
| RemoteTraceMonitor       | Y/Y                    | ./.                 | ./.                    |                                                        |
| SchemaDefs               | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| SpaceReplicationProgress | Y/Y                    | ./.                 | ./.                    |                                                        |
| TraceProgress            | Y/Y                    | ./.                 | ./.                    |                                                        |

### plugin-connector (1 flags)

Entries: browser=`plugin-connector/src/plugin.ts` node=`plugin-connector/src/plugin.node.ts` workerd=`plugin-connector/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-connector/src/capabilities/index.ts` node=`plugin-connector/src/capabilities/node.ts` workerd=`plugin-connector/src/capabilities/workerd.ts`

| module            | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                      |
| ----------------- | ---------------------- | ------------------- | ---------------------- | -------------------------- |
| AppGraphBuilder   | Y/Y                    | Y/Y                 | ./.                    |                            |
| BuiltinConnectors | Y/Y                    | ./Y                 | ./.                    |                            |
| Commands          | ./Y                    | Y/Y                 | ./.                    | SPEC_DRIFT_BETWEEN_BARRELS |
| Coordinator       | Y/Y                    | ./Y                 | ./.                    |                            |
| CreateObject      | Y/Y                    | Y/Y                 | ./.                    |                            |
| OAuthRedirect     | Y/Y                    | ./.                 | ./.                    |                            |
| OperationHandler  | Y/Y                    | Y/Y                 | Y/Y                    |                            |
| ReactSurface      | Y/Y                    | ./.                 | ./.                    |                            |
| Schema            | Y/Y                    | Y/Y                 | Y/Y                    |                            |

### plugin-debug (0 flags)

Entries: browser=`plugin-debug/src/plugin.tsx` node=`plugin-debug/src/plugin.node.ts` workerd=`plugin-debug/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-debug/src/capabilities/index.ts` node=`null` workerd=`null`

| module          | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| --------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder | Y/Y                    | Y/-                 | ./-                    |       |
| DebugSettings   | Y/Y                    | Y/-                 | ./-                    |       |
| LogRecording    | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface    | Y/Y                    | ./-                 | ./-                    |       |
| StatsPanel      | Y/Y                    | ./-                 | ./-                    |       |

### plugin-devtools (0 flags)

Entries: browser=`plugin-devtools/src/plugin.tsx` node=`plugin-devtools/src/plugin.node.ts` workerd=`plugin-devtools/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-devtools/src/capabilities/index.ts` node=`null` workerd=`null`

| module          | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| --------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder | Y/Y                    | Y/-                 | ./-                    |       |
| ReactContext    | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface    | Y/Y                    | ./-                 | ./-                    |       |

### plugin-file (0 flags)

Entries: browser=`plugin-file/src/plugin.tsx` node=`plugin-file/src/plugin.node.ts` workerd=`null`
Barrels on disk: browser=`plugin-file/src/capabilities/index.ts` node=`plugin-file/src/capabilities/node.ts` workerd=`null`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| CreateObject     | Y/Y                    | Y/Y                 | -/-                    |       |
| EdgeBackend      | Y/Y                    | Y/Y                 | -/-                    |       |
| FileUploader     | Y/Y                    | ./.                 | -/-                    |       |
| InlineBackend    | Y/Y                    | Y/Y                 | -/-                    |       |
| Markdown         | Y/Y                    | ./.                 | -/-                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | -/-                    |       |
| ReactSurface     | Y/Y                    | ./.                 | -/-                    |       |
| Schema           | Y/Y                    | Y/Y                 | -/-                    |       |
| Settings         | Y/Y                    | ./.                 | -/-                    |       |
| SkillDefinition  | Y/Y                    | Y/Y                 | -/-                    |       |

### plugin-game (0 flags)

Entries: browser=`plugin-game/src/plugin.tsx` node=`plugin-game/src/plugin.node.tsx` workerd=`plugin-game/src/plugin.workerd.tsx`
Barrels on disk: browser=`plugin-game/src/capabilities/index.ts` node=`null` workerd=`null`

| module       | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ------------ | ---------------------- | ------------------- | ---------------------- | ----- |
| CreateObject | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface | Y/Y                    | ./-                 | ./-                    |       |
| Schema       | Y/Y                    | Y/-                 | Y/-                    |       |

### plugin-illustrator (0 flags)

Entries: browser=`plugin-illustrator/src/plugin.tsx` node=`plugin-illustrator/src/plugin.node.tsx` workerd=`plugin-illustrator/src/plugin.workerd.tsx`
Barrels on disk: browser=`plugin-illustrator/src/capabilities/index.ts` node=`null` workerd=`null`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| CommentConfig    | Y/Y                    | ./-                 | ./-                    |       |
| CreateObject     | Y/Y                    | ./-                 | ./-                    |       |
| Migrations       | Y/Y                    | ./-                 | ./-                    |       |
| OperationHandler | Y/Y                    | Y/-                 | ./-                    |       |
| ReactSurface     | Y/Y                    | ./-                 | ./-                    |       |
| Schema           | Y/Y                    | Y/-                 | Y/-                    |       |
| SkillDefinition  | Y/Y                    | Y/-                 | ./-                    |       |

### plugin-inbox (2 flags)

Entries: browser=`plugin-inbox/src/plugin.tsx` node=`plugin-inbox/src/plugin.node.ts` workerd=`plugin-inbox/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-inbox/src/capabilities/index.ts` node=`plugin-inbox/src/capabilities/node.ts` workerd=`plugin-inbox/src/capabilities/workerd.ts`

| module                   | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                                                  |
| ------------------------ | ---------------------- | ------------------- | ---------------------- | ------------------------------------------------------ |
| AppGraphBuilder          | Y/Y                    | ./.                 | ./.                    |                                                        |
| AutomationTemplates      | Y/Y                    | ./.                 | ./.                    |                                                        |
| ContactExtractor         | Y/Y                    | ./.                 | ./.                    |                                                        |
| CreateObject             | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| IdentitySpecs            | Y/Y                    | ./.                 | ./.                    |                                                        |
| InboxSettings            | Y/Y                    | ./.                 | ./.                    |                                                        |
| MailboxProcessors        | Y/Y                    | ./.                 | ./.                    |                                                        |
| NavigationTargetResolver | Y/Y                    | ./.                 | ./.                    |                                                        |
| OperationHandler         | Y/Y                    | Y/Y                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS, SPEC_DRIFT_BETWEEN_BARRELS |
| ReactSurface             | Y/Y                    | ./.                 | ./.                    |                                                        |
| Schema                   | Y/Y                    | ./.                 | ./.                    |                                                        |
| SkillDefinition          | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| SummarizeExtractor       | Y/Y                    | ./.                 | ./.                    |                                                        |

### plugin-kanban (0 flags)

Entries: browser=`plugin-kanban/src/plugin.tsx` node=`plugin-kanban/src/plugin.node.ts` workerd=`plugin-kanban/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-kanban/src/capabilities/index.ts` node=`plugin-kanban/src/capabilities/node.ts` workerd=`plugin-kanban/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| CreateObject     | Y/Y                    | Y/Y                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface     | Y/Y                    | ./.                 | ./.                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SkillDefinition  | Y/Y                    | Y/Y                 | ./.                    |       |
| UndoMappings     | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-magazine (1 flags)

Entries: browser=`plugin-magazine/src/plugin.tsx` node=`null` workerd=`plugin-magazine/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-magazine/src/capabilities/index.ts` node=`null` workerd=`plugin-magazine/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                      |
| ---------------- | ---------------------- | ------------------- | ---------------------- | -------------------------- |
| AppGraphBuilder  | Y/Y                    | -/-                 | ./.                    |                            |
| CreateObject     | Y/Y                    | -/-                 | ./.                    |                            |
| OperationHandler | Y/Y                    | -/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |
| ReactSurface     | Y/Y                    | -/-                 | ./.                    |                            |
| RoutineTemplates | Y/Y                    | -/-                 | ./.                    |                            |
| Schema           | Y/Y                    | -/-                 | ./.                    |                            |
| SkillDefinition  | Y/Y                    | -/-                 | Y/Y                    |                            |

### plugin-map (0 flags)

Entries: browser=`plugin-map/src/plugin.tsx` node=`plugin-map/src/plugin.node.ts` workerd=`plugin-map/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-map/src/capabilities/index.ts` node=`plugin-map/src/capabilities/node.ts` workerd=`plugin-map/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder  | Y/Y                    | Y/Y                 | ./.                    |       |
| CreateObject     | Y/Y                    | Y/Y                 | ./.                    |       |
| MapSettings      | Y/Y                    | ./.                 | ./.                    |       |
| MapState         | Y/Y                    | ./.                 | ./.                    |       |
| MarkerProvider   | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface     | Y/Y                    | ./.                 | ./.                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SkillDefinition  | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-map-solid (1 flags)

Entries: browser=`plugin-map-solid/src/plugin.tsx` node=`plugin-map-solid/src/plugin.node.ts` workerd=`plugin-map-solid/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-map-solid/src/capabilities/index.ts` node=`null` workerd=`null`

| module  | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ------- | ---------------------- | ------------------- | ---------------------- | ----- |
| Surface | Y/Y                    | ./-                 | ./-                    |       |

Plugin-level flags:

- **BYTE_IDENTICAL_NODE_WORKERD**: plugin-map-solid/src/plugin.node.ts is byte-identical to plugin-map-solid/src/plugin.workerd.ts

### plugin-markdown (0 flags)

Entries: browser=`plugin-markdown/src/plugin.tsx` node=`null` workerd=`null`
Barrels on disk: browser=`plugin-markdown/src/capabilities/index.ts` node=`plugin-markdown/src/capabilities/node.ts` workerd=`plugin-markdown/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                                                    |
| ---------------- | ---------------------- | ------------------- | ---------------------- | -------------------------------------------------------- |
| AnchorResolver   | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| AnchorSort       | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| CommentConfig    | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| CreateObject     | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| MarkdownSettings | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| MarkdownState    | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| OperationHandler | Y/Y                    | -/Y                 | -/Y                    |                                                          |
| ReactSurface     | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| Schema           | Y/Y                    | -/Y                 | -/Y                    |                                                          |
| SkillDefinition  | Y/Y                    | -/Y                 | -/Y                    |                                                          |
| Translations     | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| UndoMappings     | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |

### plugin-observability (0 flags)

Entries: browser=`plugin-observability/src/plugin.ts` node=`plugin-observability/src/plugin.node.ts` workerd=`plugin-observability/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-observability/src/capabilities/index.ts` node=`null` workerd=`null`

| module                | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| --------------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| ClientReady           | Y/Y                    | ./-                 | ./-                    |       |
| Namespace             | Y/Y                    | ./-                 | ./-                    |       |
| Observability         | Y/Y                    | ./-                 | ./-                    |       |
| ObservabilitySettings | Y/Y                    | ./-                 | ./-                    |       |
| ObservabilityState    | Y/Y                    | ./-                 | ./-                    |       |
| OperationHandler      | Y/Y                    | ./-                 | ./-                    |       |
| PrivacyNotice         | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface          | Y/Y                    | ./-                 | ./-                    |       |

### plugin-pipeline (0 flags)

Entries: browser=`plugin-pipeline/src/plugin.tsx` node=`plugin-pipeline/src/plugin.node.ts` workerd=`plugin-pipeline/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-pipeline/src/capabilities/index.ts` node=`null` workerd=`plugin-pipeline/src/capabilities/workerd.ts`

| module       | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ------------ | ---------------------- | ------------------- | ---------------------- | ----- |
| CreateObject | Y/Y                    | Y/-                 | ./.                    |       |
| ReactSurface | Y/Y                    | ./-                 | ./.                    |       |
| Schema       | Y/Y                    | ./-                 | Y/Y                    |       |

### plugin-presenter (0 flags)

Entries: browser=`plugin-presenter/src/plugin.tsx` node=`plugin-presenter/src/plugin.node.ts` workerd=`plugin-presenter/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-presenter/src/capabilities/index.ts` node=`null` workerd=`null`

| module            | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ----------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder   | Y/Y                    | Y/-                 | ./-                    |       |
| MarkdownExtension | Y/Y                    | ./-                 | ./-                    |       |
| OperationHandler  | Y/Y                    | ./-                 | ./-                    |       |
| PresenterSettings | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface      | Y/Y                    | ./-                 | ./-                    |       |

### plugin-preview (0 flags)

Entries: browser=`plugin-preview/src/plugin.tsx` node=`plugin-preview/src/plugin.node.ts` workerd=`plugin-preview/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-preview/src/capabilities/index.ts` node=`null` workerd=`plugin-preview/src/capabilities/workerd.ts`

| module         | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| -------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| PreviewPopover | Y/Y                    | ./-                 | ./.                    |       |
| ReactSurface   | Y/Y                    | ./-                 | ./.                    |       |
| Schema         | Y/Y                    | ./-                 | Y/Y                    |       |

### plugin-projects (2 flags)

Entries: browser=`plugin-projects/src/plugin.tsx` node=`null` workerd=`plugin-projects/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-projects/src/capabilities/index.ts` node=`null` workerd=`plugin-projects/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                      |
| ---------------- | ---------------------- | ------------------- | ---------------------- | -------------------------- |
| AppGraphBuilder  | Y/Y                    | -/-                 | ./.                    |                            |
| CreateObject     | Y/Y                    | -/-                 | ./.                    |                            |
| OperationHandler | Y/Y                    | -/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |
| ReactSurface     | Y/Y                    | -/-                 | ./.                    |                            |
| Schema           | Y/Y                    | -/-                 | ./.                    |                            |
| SkillDefinition  | Y/Y                    | -/-                 | Y/Y                    |                            |
| Templates        | Y/Y                    | -/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |

### plugin-registry (1 flags)

Entries: browser=`plugin-registry/src/plugin.tsx` node=`plugin-registry/src/plugin.node.ts` workerd=`plugin-registry/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-registry/src/capabilities/index.ts` node=`plugin-registry/src/capabilities/node.ts` workerd=`null`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                      |
| ---------------- | ---------------------- | ------------------- | ---------------------- | -------------------------- |
| AppGraphBuilder  | Y/Y                    | ./.                 | ./-                    |                            |
| Commands         | ./Y                    | Y/Y                 | ./-                    | SPEC_DRIFT_BETWEEN_BARRELS |
| DevPluginLoader  | Y/Y                    | ./.                 | ./-                    |                            |
| OperationHandler | Y/Y                    | ./.                 | ./-                    |                            |
| ReactSurface     | Y/Y                    | ./.                 | ./-                    |                            |
| RegistrySettings | Y/Y                    | ./.                 | ./-                    |                            |

### plugin-review (0 flags)

Entries: browser=`plugin-review/src/plugin.tsx` node=`plugin-review/src/plugin.node.ts` workerd=`plugin-review/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-review/src/capabilities/index.ts` node=`plugin-review/src/capabilities/node.ts` workerd=`plugin-review/src/capabilities/workerd.ts`

| module              | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ------------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AgentIdentityModule | Y/Y                    | ./.                 | ./.                    |       |
| AgentRunner         | ./Y                    | ./.                 | ./.                    |       |
| AppGraphBuilder     | Y/Y                    | Y/Y                 | ./.                    |       |
| CommentState        | Y/Y                    | ./.                 | ./.                    |       |
| CommentsSettings    | ./Y                    | ./.                 | ./.                    |       |
| HistoryGraph        | Y/Y                    | Y/Y                 | ./.                    |       |
| HistorySurface      | Y/Y                    | ./.                 | ./.                    |       |
| Markdown            | Y/Y                    | ./.                 | ./.                    |       |
| MarkdownBinding     | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler    | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface        | Y/Y                    | ./.                 | ./.                    |       |
| ReviewState         | Y/Y                    | Y/Y                 | ./.                    |       |
| Schema              | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SkillDefinition     | Y/Y                    | Y/Y                 | ./.                    |       |
| UndoMappings        | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-routine (2 flags)

Entries: browser=`plugin-routine/src/plugin.tsx` node=`plugin-routine/src/plugin.node.ts` workerd=`plugin-routine/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-routine/src/capabilities/index.ts` node=`plugin-routine/src/capabilities/node.ts` workerd=`plugin-routine/src/capabilities/workerd.ts`

| module                   | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                                                  |
| ------------------------ | ---------------------- | ------------------- | ---------------------- | ------------------------------------------------------ |
| AppGraphBuilder          | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| Commands                 | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| CreateObject             | Y/Y                    | ./.                 | ./.                    |                                                        |
| LayerSpecs               | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| OperationHandler         | Y/Y                    | Y/Y                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS, SPEC_DRIFT_BETWEEN_BARRELS |
| ReactSurface             | Y/Y                    | ./.                 | ./.                    |                                                        |
| RegistrySync             | Y/Y                    | Y/Y                 | ./.                    |                                                        |
| Schema                   | Y/Y                    | ./.                 | ./.                    |                                                        |
| Templates                | Y/Y                    | Y/Y                 | Y/Y                    |                                                        |
| TriggerRuntimeController | Y/Y                    | Y/Y                 | ./.                    |                                                        |

### plugin-sample (0 flags)

Entries: browser=`plugin-sample/src/plugin.ts` node=`plugin-sample/src/plugin.node.ts` workerd=`plugin-sample/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-sample/src/capabilities/index.ts` node=`plugin-sample/src/capabilities/node.ts` workerd=`plugin-sample/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder  | Y/Y                    | ./.                 | ./.                    |       |
| CreateObject     | Y/Y                    | Y/Y                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface     | Y/Y                    | ./.                 | ./.                    |       |
| SampleSettings   | Y/Y                    | ./.                 | ./.                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |

### plugin-script (0 flags)

Entries: browser=`plugin-script/src/plugin.tsx` node=`plugin-script/src/plugin.node.ts` workerd=`plugin-script/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-script/src/capabilities/index.ts` node=`plugin-script/src/capabilities/node.ts` workerd=`plugin-script/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder  | Y/Y                    | Y/Y                 | ./.                    |       |
| Compiler         | Y/Y                    | ./.                 | ./.                    |       |
| CreateObject     | Y/Y                    | Y/Y                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface     | Y/Y                    | ./.                 | ./.                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ScriptSettings   | Y/Y                    | ./.                 | ./.                    |       |
| SkillDefinition  | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-sequencer (0 flags)

Entries: browser=`plugin-sequencer/src/plugin.tsx` node=`plugin-sequencer/src/plugin.node.ts` workerd=`plugin-sequencer/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-sequencer/src/capabilities/index.ts` node=`null` workerd=`plugin-sequencer/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| CreateObject     | Y/Y                    | ./-                 | ./.                    |       |
| OperationHandler | Y/Y                    | ./-                 | ./.                    |       |
| ReactSurface     | Y/Y                    | ./-                 | ./.                    |       |
| Schema           | Y/Y                    | ./-                 | Y/Y                    |       |
| SkillDefinition  | Y/Y                    | ./-                 | ./.                    |       |

### plugin-sheet (0 flags)

Entries: browser=`plugin-sheet/src/plugin.tsx` node=`plugin-sheet/src/plugin.node.ts` workerd=`plugin-sheet/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-sheet/src/capabilities/index.ts` node=`plugin-sheet/src/capabilities/node.ts` workerd=`plugin-sheet/src/capabilities/workerd.ts`

| module               | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| -------------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AnchorSort           | Y/Y                    | ./.                 | ./.                    |       |
| CommentConfig        | Y/Y                    | Y/Y                 | ./.                    |       |
| ComputeGraphRegistry | Y/Y                    | ./.                 | ./.                    |       |
| CreateObject         | Y/Y                    | Y/Y                 | ./.                    |       |
| Markdown             | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler     | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface         | Y/Y                    | ./.                 | ./.                    |       |
| Schema               | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SheetState           | Y/Y                    | ./.                 | ./.                    |       |
| SkillDefinition      | Y/Y                    | Y/Y                 | ./.                    |       |
| UndoMappings         | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-space (6 flags)

Entries: browser=`plugin-space/src/plugin.ts` node=`null` workerd=`null`
Barrels on disk: browser=`plugin-space/src/capabilities/index.ts` node=`plugin-space/src/capabilities/node.ts` workerd=`plugin-space/src/capabilities/workerd.ts`

| module                               | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                                                                                |
| ------------------------------------ | ---------------------- | ------------------- | ---------------------- | ------------------------------------------------------------------------------------ |
| AppGraphBuilder                      | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| Commands                             | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| CreateObject                         | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| IdentityCreated                      | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| NavigationHandler                    | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| NavigationTargetResolver             | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| OperationHandler                     | Y/Y                    | -/Y                 | -/Y                    | SPEC_DRIFT_BETWEEN_BARRELS, SPEC_DRIFT_BETWEEN_BARRELS                               |
| PluginAsset                          | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| ReactRoot                            | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| ReactSurface                         | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| Repair                               | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| Schema                               | Y/Y                    | -/Y                 | -/Y                    | SPEC_DRIFT_BETWEEN_BARRELS, SPEC_DRIFT_BETWEEN_BARRELS, SPEC_DRIFT_BETWEEN_BARRELS   |
| SpaceSettings                        | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| SpaceState                           | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| SpacesReady                          | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| Translations                         | Y/Y                    | -/Y                 | -/Y                    | EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB                             |
| UndoMappings                         | Y/Y                    | -/Y                 | -/Y                    | SPEC_DRIFT_BETWEEN_BARRELS, EXCLUDED_VIA_UNDEFINED_STUB, EXCLUDED_VIA_UNDEFINED_STUB |
| makeCreateObjectEntryForDatabaseType | ./Y                    | -/.                 | -/.                    |                                                                                      |

### plugin-table (0 flags)

Entries: browser=`plugin-table/src/plugin.tsx` node=`plugin-table/src/plugin.node.ts` workerd=`plugin-table/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-table/src/capabilities/index.ts` node=`plugin-table/src/capabilities/node.ts` workerd=`plugin-table/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| CommentConfig    | Y/Y                    | Y/Y                 | ./.                    |       |
| CreateObject     | Y/Y                    | Y/Y                 | ./.                    |       |
| OnTypeAdded      | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface     | Y/Y                    | ./.                 | ./.                    |       |
| Schema           | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SkillDefinition  | Y/Y                    | Y/Y                 | ./.                    |       |

### plugin-tasks (1 flags)

Entries: browser=`plugin-tasks/src/plugin.tsx` node=`null` workerd=`plugin-tasks/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-tasks/src/capabilities/index.ts` node=`null` workerd=`plugin-tasks/src/capabilities/workerd.ts`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags                      |
| ---------------- | ---------------------- | ------------------- | ---------------------- | -------------------------- |
| AppGraphBuilder  | Y/Y                    | -/-                 | ./.                    |                            |
| CreateObject     | Y/Y                    | -/-                 | ./.                    |                            |
| OperationHandler | Y/Y                    | -/-                 | Y/Y                    | SPEC_DRIFT_BETWEEN_BARRELS |
| ReactSurface     | Y/Y                    | -/-                 | ./.                    |                            |
| Schema           | Y/Y                    | -/-                 | ./.                    |                            |

### plugin-thread (1 flags)

Entries: browser=`plugin-thread/src/plugin.tsx` node=`plugin-thread/src/plugin.node.ts` workerd=`plugin-thread/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-thread/src/capabilities/index.ts` node=`plugin-thread/src/capabilities/node.ts` workerd=`plugin-thread/src/capabilities/workerd.ts`

| module             | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ------------------ | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder    | Y/Y                    | ./.                 | ./.                    |       |
| ChannelBackendFeed | Y/Y                    | Y/Y                 | Y/Y                    |       |
| CreateObject       | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler   | Y/Y                    | Y/Y                 | Y/Y                    |       |
| ReactSurface       | Y/Y                    | ./.                 | ./.                    |       |
| Schema             | Y/Y                    | Y/Y                 | Y/Y                    |       |

Plugin-level flags:

- **BYTE_IDENTICAL_NODE_WORKERD**: plugin-thread/src/plugin.node.ts is byte-identical to plugin-thread/src/plugin.workerd.ts

### plugin-transcription (0 flags)

Entries: browser=`plugin-transcription/src/plugin.tsx` node=`plugin-transcription/src/plugin.node.ts` workerd=`plugin-transcription/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-transcription/src/capabilities/index.ts` node=`plugin-transcription/src/capabilities/node.ts` workerd=`plugin-transcription/src/capabilities/workerd.ts`

| module                | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| --------------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder       | Y/Y                    | ./.                 | ./.                    |       |
| EntityLookup          | Y/Y                    | ./.                 | ./.                    |       |
| MarkdownExtension     | Y/Y                    | ./.                 | ./.                    |       |
| OperationHandler      | Y/Y                    | Y/Y                 | Y/Y                    |       |
| PipelineStatus        | Y/Y                    | ./.                 | ./.                    |       |
| ReactSurface          | Y/Y                    | ./.                 | ./.                    |       |
| RecordingSession      | Y/Y                    | ./.                 | ./.                    |       |
| Schema                | Y/Y                    | Y/Y                 | Y/Y                    |       |
| SkillDefinition       | Y/Y                    | Y/Y                 | ./.                    |       |
| TextContent           | Y/Y                    | Y/Y                 | ./.                    |       |
| Transcriber           | Y/Y                    | ./.                 | ./.                    |       |
| TranscriptionDriver   | Y/Y                    | ./.                 | ./.                    |       |
| TranscriptionSettings | Y/Y                    | ./.                 | ./.                    |       |

### plugin-trip (0 flags)

Entries: browser=`plugin-trip/src/plugin.tsx` node=`plugin-trip/src/plugin.node.ts` workerd=`plugin-trip/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-trip/src/capabilities/index.ts` node=`null` workerd=`null`

| module           | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ---------------- | ---------------------- | ------------------- | ---------------------- | ----- |
| AppGraphBuilder  | Y/Y                    | ./-                 | ./-                    |       |
| CreateObject     | Y/Y                    | ./-                 | ./-                    |       |
| MarkerProvider   | Y/Y                    | ./-                 | ./-                    |       |
| OperationHandler | Y/Y                    | ./-                 | ./-                    |       |
| ReactSurface     | Y/Y                    | ./-                 | ./-                    |       |
| Schema           | Y/Y                    | ./-                 | ./-                    |       |
| Settings         | Y/Y                    | ./-                 | ./-                    |       |
| SkillDefinition  | Y/Y                    | ./-                 | ./-                    |       |

### plugin-wnfs (1 flags)

Entries: browser=`plugin-wnfs/src/plugin.tsx` node=`plugin-wnfs/src/plugin.node.ts` workerd=`plugin-wnfs/src/plugin.workerd.ts`
Barrels on disk: browser=`plugin-wnfs/src/capabilities/index.ts` node=`null` workerd=`null`

| module       | browser (entry/barrel) | node (entry/barrel) | workerd (entry/barrel) | flags |
| ------------ | ---------------------- | ------------------- | ---------------------- | ----- |
| BlobBackend  | Y/Y                    | ./-                 | ./-                    |       |
| Dependencies | Y/Y                    | ./-                 | ./-                    |       |

Plugin-level flags:

- **BYTE_IDENTICAL_NODE_WORKERD**: plugin-wnfs/src/plugin.node.ts is byte-identical to plugin-wnfs/src/plugin.workerd.ts
