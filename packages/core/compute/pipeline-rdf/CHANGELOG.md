# @dxos/pipeline-rdf

## 0.17.0

### Minor Changes

- dd40958: Fact stores gain `FactStoreApi.rows(sparql)` for open-ended SPARQL SELECTs (`rows` and `select` refuse updates), a file-backed `FactStoreLive.layerFile`, and `FactStoreHttp` to serve a store over HTTP to pages on this machine; `generateSparql` writes full SPARQL from a question, newly minted predicates are named as written (`changed`, not `chang`), and `asked` / `has text` join the seed vocabulary. Discord crawls name each user by one `https://discord.com/users/<id>` IRI labelled from Discord, record detected questions as facts, take per-channel lookback settings, and retry channels that failed before; Brain's Query Facts and Summarize Subject find entities by name or by any absolute IRI and skip superseded or retracted facts. `Chat.Suggestions` shows premade prompts above the composer, and the entity browser, entity card and TriG snippet move from `@dxos/plugin-agent` to `@dxos/react-ui-rdf`.

  Breaking: every `FactStoreApi` implementation must add `rows`, and `@dxos/plugin-agent/AgentKnowledge` no longer exports the moved components.

- 342ff5a: A fact store moves in and out as TriG (Turtle with a named graph per fact): `FactStoreApi.exportTrig` and `importTrig`, served by `FactStoreHttp` too. `RDF.Pipeline` keeps the state of the run that filled a store beside its facts — each source's cursor and first and last item, each stage's model calls, tokens and catalog cost, the run's time and the facts written — and the Discord facts CLI's `trig` mode writes it from a crawl's `crawl.db` and `trace.jsonl`.

  Brain adds a Memory view, under a space's settings and as a context-sidebar panel, that imports and exports the space's store as TriG, runs SPARQL, and shows every query an agent runs against the store, with its rows, as it runs; and a Pipeline panel that draws the recorded run on a read-only canvas with its counters, cost, models and busiest channels. The Brain skill now has a description, so the Skill Manager offers it as the space's memory.

  Breaking: `FactStoreApi` gains `exportTrig` and `importTrig`, which every implementation must provide; `FactStoreRegistry` gains `logged`, `queries` and `subscribeQueries`, and operations now get the logged store.

- d699067: Fact extraction now seeds its ontology with curated predicates from published vocabularies by default (`RDF.Vocabularies.DEFAULT`: schema.org, FOAF, Dublin Core, W3C ORG and SIOC under their own IRIs) and a `uses` seed predicate; pass an `ontology` to narrow it, and `ExtractOptions.closed` drops relations no listed predicate fits instead of minting new ones. The extractor defaults to Claude Haiku 5.5, sends its stable instructions as a cached system message (predicates learned from the store follow in a second, uncached one), and takes `ExtractOptions.thinking` (on by default); `ExtractOptions.extractor: 'system-one'` extracts with Cloudflare's Clairic and Clef models, falling back to the LLM per uncertain claim, a claim the caller's rules can't be checked against, or an unresolved reference; `ExtractDocument.context` carries earlier messages for resolving references. The model catalog lists Haiku 5.5 with list and cache prices (`Model.pricing`), and the Anthropic resolver sends `thinking: disabled` when a thinking model is asked not to think.

  Model calls can be metered: `AiUsage.instrument` reports each language-model call's tokens, `AiUsage.withStage` attributes them to a pipeline stage, and `AiMetering.metered` (in `@dxos/compute`) is an `AiService` layer that writes each call as a durable `Trace.ModelCall` event, with `AiMetering.summarize` totalling them by model and stage at catalog prices. `Stage.batch` and the crawler's `tapStage` take a `concurrency`, which the crawler's fact extraction (`ExtractFactsOptions.concurrency`) and the Discord pipeline's topics stage (`RunOptions.topicsConcurrency`) pass through. Brain gains a Query SPARQL tool for raw SELECTs, and the fact tools cap what they return to the agent (50 rows, 500 characters a value) with a note to page with `LIMIT`/`OFFSET`; Query Facts takes an `offset` and returns `{ facts, total, note }`.

  The fact explorer's lists (`react-ui-rdf`'s entity browser, fact viewer and ontology list) render only the rows near the viewport, and the entity browser gains a row of type toggles with counts; new exports `VirtualList`, `TypeFilter` and `entityTypeCounts`. `@dxos/plugin-magazine` exports its RSS and Atom parser as `@dxos/plugin-magazine/FeedParser`. `@dxos/plugin-sheet` adds an Add Chart operation (`SheetOperation.AddChart`, in the sheet skill) so an agent can chart a range of a sheet it made. `@dxos/plugin-brain/RemoteFactStorePlugin` gives every space a fact store served over HTTP (`RemoteFactStorePlugin.make(url)`) with the Brain skill and its operations, so a story or app can point an agent's memory at a fact server.

  Breaking: extraction without an explicit `ontology` now shows the model the vocabulary packs as well as the seed predicates, so it reuses published predicates and its prompt is longer; Query Facts returns `{ facts, total, note? }` instead of an array.

### Patch Changes

- Updated dependencies [2ffc301]
- Updated dependencies [498840b]
- Updated dependencies [3585abc]
- Updated dependencies [54ceffb]
- Updated dependencies [3aef671]
- Updated dependencies [6ba7a88]
- Updated dependencies [c9c3867]
- Updated dependencies [d159a7d]
- Updated dependencies [ad3d5e0]
- Updated dependencies [768db81]
  - @dxos/ai@0.17.0
  - @dxos/echo-memory@0.17.0
  - @dxos/sparql-sqlite@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/util@0.17.0
  - @dxos/sql-sqlite@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/log@0.17.0
  - @dxos/pipeline@0.17.0
  - @dxos/errors@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- @dxos/ai@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/errors@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/log@0.16.0
  - @dxos/sql-sqlite@0.16.0
  - @dxos/util@0.16.0
  - @dxos/pipeline@0.16.0
  - @dxos/sparql-sqlite@0.16.0

## 0.15.0

### Minor Changes

- 278f49c: An agent's brain holds only facts: the agent remembers and recalls structured facts rather than free-text memories.

  - `@dxos/plugin-agent` (breaking): `MemoryOperation.Remember` is now `org.dxos.operation.agent.recordFacts` and takes `facts` — each a subject, a predicate from the seed ontology (listed in the tool's description), an entity `object` or a literal `value`, and optional `quote`, `origin`, `confidence` and `supersedes` — and returns their ids. `Recall` returns `facts` (now with an `id`) and `goals` only, leaving out superseded, retracted and expired facts. `Forget`, `RecalledMemory`, `Mode.records` and the `@dxos/plugin-agent/Knowledge` subpath are removed. Profiles group the facts about their subject by predicate, and the knowledge, state and profile panels show facts in place of memories. Memories already stored in a brain are no longer read.
  - `@dxos/pipeline-rdf`: exports `predicateSection`, the ontology's predicates as a prompt section.
  - `@dxos/plugin-agent`, `@dxos/plugin-discord`: a channel agent is told that an answer it only writes out is lost, so it delivers answers with its channel tools (Discord reply or direct message) instead of plain text.

- bc72a37: Facts are stored as statements in named graphs that state their provenance once, with predicates from an extensible ontology (`RDF.Ontology`) and entities keyed by real IRIs where one is known; a store from an earlier release migrates on open. Breaking: plugin-agent's `Memory` ECHO type is removed, since memories are now graphs in the agent's brain (`Knowledge`), recalled and superseded by id and withdrawn with the new Forget operation.
- 35030a7: Fact extraction now reuses existing predicates and stable entity IRIs. The extractor is shown every predicate the brain knows and the known entities by name. A predicate it has to invent is minted in the brain's own namespace with a definition, and stored as an `rdf:Property` in the ontology graph (`FactStore.predicates`). Every fact store now starts with the seed vocabulary (schema.org, FOAF, Dublin Core, SKOS and RDF predicates; `is a` is `rdf:type`) and gets it back when cleared. A mention resolved to no stable IRI is local to the graph that mentions it. The agent knowledge panel gains a Predicates tab. Breaking: new facts are stored with different predicate and class IRIs (the former `dx:` IRIs stay equivalent, so older facts still match), and `FactStoreApi` gains `predicates`.
- 55bdf55: The agent's fact graph can be browsed as entity cards, with Turtle and TriG highlighted in the editor.

  - `@dxos/plugin-agent`: `EntityCard` shows one entity of the fact graph (its type, name, properties, and the properties pointing at it, with chips coloured by type), and `EntityBrowser` explores the graph as Finder-style columns, each with a filter, a close action and arrow-key navigation.
  - `@dxos/pipeline-rdf`: `Predicate.label` writes a predicate or an inverse in one display form, lowercase kebab-case (`works-at`, `known-by`).
  - `@dxos/ui-editor`: `turtle()` highlights RDF 1.1 Turtle and TriG (prefixes, IRIs, prefixed names, blank nodes, literals with language tags and datatypes, graph blocks).
  - `@dxos/react-ui`: a chosen card in a keyboard stack (a `Focus.Item`) shows the current surface rather than the accent border, so the focus ring is the only edge it draws.

- 2208806: The RDF fact store now runs on `@dxos/sparql-sqlite`, which compiles SPARQL to SQLite and keeps literal datatypes. `FactStoreLive.layer` and `FactStoreLive.make` take a synchronous SQLite handle (`SqlStorage`) instead of an Effect `SqlClient`, Comunica is removed, and existing fact tables are dropped on first open.

### Patch Changes

- Updated dependencies [cd70a43]
- Updated dependencies [1e9c017]
- Updated dependencies [6d8c4ee]
  - @dxos/sql-sqlite@0.15.0
  - @dxos/ai@0.15.0
  - @dxos/sparql-sqlite@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/util@0.15.0
  - @dxos/pipeline@0.15.0
  - @dxos/errors@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0
  - @dxos/log@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [1819960]
  - @dxos/effect@0.14.0
  - @dxos/ai@0.14.0
  - @dxos/sql-sqlite@0.14.0
  - @dxos/pipeline@0.14.0
  - @dxos/errors@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/log@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Minor Changes

- 246ee3c: Add `@dxos/plugin-agent`, an agent that talks to people through any channel, remembers them as ECHO objects, reads every conversation turn into facts, relays messages, and keeps one-time and ongoing ("keep me posted") watches whose updates it writes from the conversation's context. Every subpath of the package is a namespace: `AgentState` and `AgentKnowledge` (each with a `Root` container), one per skill (`ConversationSkill`, `GoalsSkill`, `InterviewSkill`, `ModesSkill`, `NoteTakerSkill`, `RelaySkill`), and one per type and operation set.

  `@dxos/plugin-thread` channel backends can now open direct conversations (`openDirect`), post into threads (`threads.send`), run a connection (`connection.start`/`stop`/`status`), and return a send receipt. New operations `sendToChannel`, `openDirect`, `connectChannel`, `disconnectChannel` and `getChannelStatus` dispatch to them, and the handlers are published as the `ThreadOperationHandlerSet` subpath. The Discord and Slack plugins implement these backends.

  An agent prompt can name its sender: `AgentProcess` accepts `{ prompt, sender?, properties? }` as well as a bare prompt (`AgentInput`, `makeInputMessage`), `AgentService.Session.submitPrompt` and the assistant's request and session take a `sender`, and the model sees a named sender as `[From: <name>]`. `useChatProcessor` and `AiChatProcessor` take a `sender`, and `ChatThread` takes a `userHue`.

  `Agent.loadChat` no longer picks a chat bridged from an external conversation as the agent's primary chat, and finds chats with a child-of filter so it also works on EDGE. `Agent.makeInitialized` accepts a skill ref, and `Skill.makeRef` binds a database skill as-is and any other by registry URI.

  The `ProfileOf` relation moves from `@dxos/plugin-crm` to `@dxos/types` with its typename unchanged, so existing profiles still resolve. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. `pipeline-rdf` exports `DEFAULT_MODEL`. `FormInlineAnnotation` now survives the JSON-schema round trip. A plugin that declares two modules with the same id now fails when it is constructed instead of silently dropping one.

### Patch Changes

- Updated dependencies [c6922ce]
- Updated dependencies [cb1e218]
- Updated dependencies [1b2e9f3]
- Updated dependencies [5a27d5c]
- Updated dependencies [e99ee70]
- Updated dependencies [3e73e53]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
  - @dxos/ai@0.13.0
  - @dxos/util@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/log@0.13.0
  - @dxos/sql-sqlite@0.13.0
  - @dxos/pipeline@0.13.0
  - @dxos/errors@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/keys@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [8363f12]
- Updated dependencies [a7f4329]
- Updated dependencies [155ca6f]
- Updated dependencies [24cbdff]
- Updated dependencies [c50f666]
- Updated dependencies [a7f4329]
- Updated dependencies [9477170]
- Updated dependencies [0524d38]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [212361b]
- Updated dependencies [b2d5bb2]
- Updated dependencies [fd23a8b]
- Updated dependencies [49aee6c]
- Updated dependencies [b63506b]
- Updated dependencies [88e3ebd]
- Updated dependencies [a7f4329]
- Updated dependencies [7575cb6]
- Updated dependencies [3e02201]
- Updated dependencies [782a442]
- Updated dependencies [7b49616]
- Updated dependencies [472ca95]
- Updated dependencies [967b130]
- Updated dependencies [882ac2a]
- Updated dependencies [4aa6a33]
- Updated dependencies [9d2466a]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [dfce73e]
- Updated dependencies [df93cc2]
- Updated dependencies [9ffccd5]
- Updated dependencies [74acdc6]
- Updated dependencies [a24c7fb]
- Updated dependencies [09fedd7]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [578b543]
- Updated dependencies [e426625]
- Updated dependencies [3d23fd7]
- Updated dependencies [6dadb41]
  - @dxos/ai@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/sql-sqlite@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/pipeline@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/pipeline@0.11.1
- @dxos/sql-sqlite@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/sql-sqlite@0.11.0
  - @dxos/pipeline@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
