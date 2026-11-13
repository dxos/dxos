---
branch: dm/discord-extraction
commit: c230c455217c94058deb1783660848acd646f63f
base: 0cb6c97ea0e37d36f064dc915525367a5d25b793
mode: fast
createdAt: 2026-11-13T16:52:33.141Z
isFinalized: true
groups: 383
rules: [bounded-live-state, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-test-suite-per-module, operations-resolve-database-from-service, stable-component-for-optional-content, story-for-new-ui-component, structured-logging-not-console, test-asserts-real-behavior, test-at-owning-package, test-real-scenario-not-narrower-proxy]
reviewId: c230c455217
---

_6 error(s), 36 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c230c455217-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/AgentRegistry.ts:71
- c230c455217-2 - ignored - bounded-live-state - packages/core/compute/crawler/src/AgentRegistry.ts:186
- c230c455217-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/crawler/src/Crawler.test.ts:31
- c230c455217-4 - ignored - bounded-live-state - packages/core/compute/crawler/src/Crawler.ts:61
- c230c455217-5 - ignored - operations-resolve-database-from-service - packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:18
- c230c455217-6 - ignored - namespace-export-with-internal-hiding - packages/core/compute/pipeline-rdf/src/index.ts:1
- c230c455217-7 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.test.ts:40
- c230c455217-8 - ignored - flat-layer-composition - packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.ts:122
- c230c455217-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-rdf/src/store/fact-store-http.ts:80
- c230c455217-10 - ignored - bounded-live-state - packages/core/compute/pipeline-rdf/src/store/fact-store-live.ts:109
- c230c455217-11 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/pipeline-rdf/src/store/index.ts:1
- c230c455217-12 - ignored - no-casts - packages/core/compute/pipeline-rdf/src/testing/index.ts:18
- c230c455217-13 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/pipeline-rdf/src/types/Graph.ts:1
- c230c455217-14 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/AgentKnowledge.ts:1
- c230c455217-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.tsx:511
- c230c455217-16 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/Chat.ts:1
- c230c455217-17 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:709
- c230c455217-18 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:1036
- c230c455217-19 - ignored - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:1162
- c230c455217-20 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/operations/facts.ts:54
- c230c455217-21 - ignored - no-casts - packages/plugins/plugin-brain/src/operations/operations.test.ts:55
- c230c455217-22 - ignored - flat-layer-composition - packages/plugins/plugin-brain/src/operations/operations.test.ts:55
- c230c455217-23 - ignored - one-test-suite-per-module - packages/plugins/plugin-brain/src/operations/operations.test.ts:117
- c230c455217-24 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/operations/query-facts.ts:28
- c230c455217-25 - ignored - dont-leak-internal-api-through-public-surface - packages/plugins/plugin-brain/src/types/BrainOperation.ts:41
- c230c455217-26 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:140
- c230c455217-27 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/fact-server.ts:69
- c230c455217-28 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:60
- c230c455217-29 - ignored - test-asserts-real-behavior - packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:72
- c230c455217-30 - ignored - test-at-owning-package - packages/plugins/plugin-discord/src/testing/reextract.test.ts:30
- c230c455217-31 - ignored - structured-logging-not-console - packages/plugins/plugin-discord/src/testing/reextract.test.ts:66
- c230c455217-32 - ignored - stable-component-for-optional-content - packages/stories/stories-brain/src/components/KnowledgePanel/KnowledgePanel.tsx:89
- c230c455217-33 - ignored - stable-component-for-optional-content - packages/stories/stories-brain/src/components/QueryPanel/QueryPanel.tsx:157
- c230c455217-34 - ignored - no-try-catch-in-effect-code - packages/stories/stories-brain/src/modules/EntitiesModule.tsx:21
- c230c455217-35 - ignored - bounded-live-state - packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:56
- c230c455217-36 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:183
- c230c455217-37 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:207
- c230c455217-38 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityCard.tsx:173
- c230c455217-39 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/EntityBrowser/KnowledgeCard.tsx:32
- c230c455217-40 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:102
- c230c455217-41 - ignored - story-for-new-ui-component - packages/ui/react-ui-rdf/src/components/TurtleSnippet/TurtleSnippet.tsx:38
- c230c455217-42 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-rdf/src/index.ts:1

## Issues

# WARN c230c455217-1 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/AgentRegistry.ts:71`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 71-88 (`export const layerSql: Layer.Layer<AgentRegistry, never, SqlClient.SqlClient>...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c230c455217-2 bounded-live-state `packages/core/compute/crawler/src/AgentRegistry.ts:186`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.83. The likeliest place is lines 186-197 (`agents.set(id, created);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/crawler/src/Crawler.test.ts:31`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 31-41 (`const runCrawl = (config: Type.Config, options?: Crawler.StreamOptions) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c230c455217-4 bounded-live-state `packages/core/compute/crawler/src/Crawler.ts:61`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 61-66 (`const seedFrontier = (config: Type.Config): Effect.Effect<void, StateError, S...`, location confidence 0.51). Judged with added `diff, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-5 operations-resolve-database-from-service `packages/core/compute/pipeline-discord/src/stages/extract-questions.ts:18`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.86. The likeliest place is lines 18-32 (`export type ExtractQuestionsOptions = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-6 namespace-export-with-internal-hiding `packages/core/compute/pipeline-rdf/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-15 (`export * as RDF from './types/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-7 test-real-scenario-not-narrower-proxy `packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.test.ts:40`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.85. The likeliest place is lines 40-51 (`it.effect(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-8 flat-layer-composition `packages/core/compute/pipeline-rdf/src/internal/sparql/nl-to-sparql.ts:122`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 122-133 (`export const generateSparql = (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-9 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-rdf/src/store/fact-store-http.ts:80`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 80-91 (`export const make = (baseUrl: string): FactStoreApi => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c230c455217-10 bounded-live-state `packages/core/compute/pipeline-rdf/src/store/fact-store-live.ts:109`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 109-120 (`const open = (storage: SqlStorage, transactionSync: NonNullable<Options['tran...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-11 import-as-namespace-is-all-or-nothing `packages/core/compute/pipeline-rdf/src/store/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-12 (`export * from './fact-graph.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c230c455217-12 no-casts `packages/core/compute/pipeline-rdf/src/testing/index.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 18-31 (`export const mockAiService = (object: unknown): Layer.Layer<AiService.AiServi...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-13 import-as-namespace-is-all-or-nothing `packages/core/compute/pipeline-rdf/src/types/Graph.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-15 (`import { type Quad, Writer } from 'n3';`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-14 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/AgentKnowledge.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-9 (`export { AgentKnowledge as Root } from './containers/AgentKnowledge/AgentKnow...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/components/AgentKnowledge/AgentKnowledge.tsx:511`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 511-522 (`const AgentKnowledgeGraph = ({ nodes, edges }: AgentKnowledgeGraphProps) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-16 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/Chat.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 1-10 (`import { Chat as ChatParts } from './components/Chat/index.ts';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-17 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:709`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 709-732 (`useEffect(() => {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-18 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:1036`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 1036-1059 (`return (`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-19 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:1162`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 1162-1185 (`const ChatSuggestions = ({ classNames, suggestions, onSelect }: ChatSuggestio...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-20 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/operations/facts.ts:54`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.93. The likeliest place is lines 54-65 (`export const resolveEntityKeys = (name: string): Effect.Effect<string[], Sema...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c230c455217-21 no-casts `packages/plugins/plugin-brain/src/operations/operations.test.ts:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 55-68 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-22 flat-layer-composition `packages/plugins/plugin-brain/src/operations/operations.test.ts:55`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 55-68 (`const textAiService = (text: string): Layer.Layer<AiService.AiService> =>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-23 one-test-suite-per-module `packages/plugins/plugin-brain/src/operations/operations.test.ts:117`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.84. The likeliest place is lines 117-128 (`describe('entity names', () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-24 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/operations/query-facts.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 28-40 (`export const queryCompactFacts = ({`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-25 dont-leak-internal-api-through-public-surface `packages/plugins/plugin-brain/src/types/BrainOperation.ts:41`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.89. The likeliest place is lines 41-52 (`pageSize: Schema.optional(`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-26 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/crawl-demo.test.ts:140`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 140-151 (`console.log(`messages: ${result.stored}`);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-27 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/fact-server.ts:69`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 69-80 (`yield* Scope.close(previous.scope, Exit.void);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-28 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:60`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 60-71 (`for (const question of questions) {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-29 test-asserts-real-behavior `packages/plugins/plugin-discord/src/testing/questions-demo.test.ts:72`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.90. The likeliest place is lines 72-80 (`}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-30 test-at-owning-package `packages/plugins/plugin-discord/src/testing/reextract.test.ts:30`

System One judges this a likely violation of `test-at-owning-package` (Test behavior in the lowest package that implements it, not through a plugin), p=0.83. The likeliest place is lines 30-41 (`describe('re-extract', () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-31 structured-logging-not-console `packages/plugins/plugin-discord/src/testing/reextract.test.ts:66`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 66-77 (`const questions = result.facts.filter((fact) => fact.extractor.id === 'extrac...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-32 stable-component-for-optional-content `packages/stories/stories-brain/src/components/KnowledgePanel/KnowledgePanel.tsx:89`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 89-100 (`) : (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-33 stable-component-for-optional-content `packages/stories/stories-brain/src/components/QueryPanel/QueryPanel.tsx:157`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.83. The likeliest place is lines 157-168 (`{result.count} {result.kind === 'graphs' ? 'graph' : 'row'}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-34 no-try-catch-in-effect-code `packages/stories/stories-brain/src/modules/EntitiesModule.tsx:21`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 21-34 (`const toOntology = (entries: readonly RDF.Ontology.Entry[]): RDF.Ontology.Ont...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c230c455217-35 bounded-live-state `packages/stories/stories-brain/src/stories/FactExplorer.stories.tsx:56`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 56-67 (`const listener = (read: readonly RDF.Fact[]) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-36 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:183`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 183-194 (`export const EntityBrowser = Util.composable<HTMLDivElement, EntityBrowserPro...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-37 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityBrowser.tsx:207`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 207-218 (`if (!controlled) {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-38 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/EntityCard.tsx:173`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 173-184 (`export const EntityCard = Util.composable<HTMLDivElement, EntityCardProps>(`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-39 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/EntityBrowser/KnowledgeCard.tsx:32`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.93. The likeliest place is lines 32-46 (`export const KnowledgeCard = ({ icon, title, rows, children, testId, data, se...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-40 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 102-113 (`(predicate == null || fact.assertion.predicate === predicate),`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-41 story-for-new-ui-component `packages/ui/react-ui-rdf/src/components/TurtleSnippet/TurtleSnippet.tsx:38`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 38-49 (`export const TurtleSnippet = memo(({ source, language = 'turtle', className, ...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c230c455217-42 namespace-export-with-internal-hiding `packages/ui/react-ui-rdf/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.98. The likeliest place is lines 1-8 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- c230c455217-1: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-2: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-3: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-6: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-10: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-11: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-12: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-13: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-14: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-15: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-16: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-17: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-18: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-21: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-22: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-24: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-25: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-28: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-29: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-40: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-42: ignored — the finding points at code this PR did not change (pre-existing).
- c230c455217-36: ignored — the component moved from plugin-agent unchanged; its story stays plugin-agent's AgentKnowledge.stories.
- c230c455217-38: ignored — the component moved from plugin-agent unchanged; its story stays plugin-agent's AgentKnowledge.stories.
- c230c455217-39: ignored — the component moved from plugin-agent unchanged; its story stays plugin-agent's AgentKnowledge.stories.
- c230c455217-41: ignored — the component moved from plugin-agent unchanged; its story stays plugin-agent's AgentKnowledge.stories.
- c230c455217-4: ignored — bounded-live-state: the frontier holds the configured channels and the threads found under them, bounded by the crawl config.
- c230c455217-5: ignored — operations-resolve-database-from-service: extractQuestionsStage is a pipeline stage, not an operation; its optional `db` predates this PR.
- c230c455217-7: ignored — test-real-scenario-not-narrower-proxy: the test claims prompt/parse/retry coverage with a mocked model, not end-to-end.
- c230c455217-8: ignored — flat-layer-composition: generateSparql provides its model layer inside the function exactly as the existing generateQuery does.
- c230c455217-9: ignored — effect-fn-not-hand-wrapped-gen: `call` is generic over the result schema, which Effect.fnUntraced does not carry.
- c230c455217-19: ignored — event-handler-naming-convention: ChatSuggestions is ported verbatim from 9e115194832 (dm/cool-babbage-13ak6p); renaming here would diverge from it.
- c230c455217-23: ignored — one-test-suite-per-module: the suite covers resolveEntityKeys, which QueryFacts and SummarizeSubject share.
- c230c455217-26: ignored — structured-logging-not-console: crawl-demo is a CLI demo whose console output is the product.
- c230c455217-27: ignored — structured-logging-not-console: fact-server is a CLI whose console output is the product.
- c230c455217-30: ignored — test-at-owning-package: reextract is an env-gated CLI task run through vitest, not a test of behavior.
- c230c455217-31: ignored — structured-logging-not-console: reextract is a CLI demo whose console output is the product.
- c230c455217-32: ignored — stable-component-for-optional-content: the tabs render one of two different panels by design.
- c230c455217-33: ignored — stable-component-for-optional-content: the result count is present only when a result is.
- c230c455217-34: ignored — no-try-catch-in-effect-code: toOntology is synchronous React-side code wrapping a throwing constructor, not Effect code.
- c230c455217-35: ignored — bounded-live-state: the graph set is reset after each 3 s lookup window and is bounded by the store's graphs.
- c230c455217-37: ignored — extract-non-rendering-logic-from-component: the controlled-selection sync is a few lines of component-local state.
- c230c455217-20: resolved — resolveEntityKeys is now Effect.fnUntraced.


### System One pass

- model: jev-latest
- base for context: `0cb6c97ea0e37d36f064dc915525367a5d25b793`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 42 violations written to fragments, 609 uncertain, 3157 clean, 0 unanswered
- left for an agentic reviewer: 112 batch(es)

```text
requests: 1582 (369 verdicts re-asked with context the model requested)
estimated input tokens: 10212053
billed input tokens: 9614899 (cost $0.4038)
measured chars per token: 3.19
```
