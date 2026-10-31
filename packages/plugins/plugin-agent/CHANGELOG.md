# @dxos/plugin-agent

## 0.17.0

### Minor Changes

- d65fd2a: An agent's admins keep their rights once EDGE checks them against the `IdentityAdmin` credentials the agent issues: an admin's Composer asks EDGE to make each member who can edit the agent's space one of its admins. Admins are only added; a member made a reader or removed stays an admin. `EdgeHttpClient` gains `getBrain` and `addBrainAdmin` for these calls.
- af3985b: A new conversation with an agent starts with the skills its instructions name at that moment, rather than a copy of its first chat's skills, so editing an agent's skills reaches its next conversation; new agents can also enable further skills themselves partway through one, and get the Database skill, whose new `getObjectLink` tool returns a Composer link to an object for places that cannot follow an `echo://` reference. The Drawing, Presenter and Sheet skills and their operations now load in headless hosts such as workerd, where drawings are laid out without a rendered surface.

### Patch Changes

- eea5752: Opening an agent in a space it was added to now opens your own conversation with it in that space, instead of the conversation from its home space. Each space keeps its own conversation; what the agent knows is still shared through its one brain.
- 1b93cb0: An agent that answers a Discord thread, DM or email thread in plain text instead of sending its reply is now reminded once to send it, so the person no longer sees "typing…" and then nothing. Channel send operations are marked with `AgentChannels.channelSend(field)`, naming the output field that says where the message went; a new channel marks its own send operation the same way.
- 5e9c5ab: Profile › Agents lists the agents you administer in the contacts book's rows, the same as Profile › Contacts, and no longer lists each agent's admins.
- a245692: `EdgeHttpClient` gains named methods for the agent routes plugin-agent called by path: `provisionBrain`, `addBrainSpace`, `claimMailbox`, `releaseMailbox`, `getMailbox` and `sendMailboxEmail`. plugin-agent now calls those methods instead of building the paths and response schemas itself.
- ddd19e9: Opening an agent again while its first open is still making your chat with it no longer makes a second chat, and when two devices each made one, the agent opens the one you last talked in.
- 80c25fe: The transcription microphone shows in every chat prompt again, just before Send: the Space Home prompt, the assistant companion before its first message, an agent's chat, and stored chats. Each prompt reads the buttons other plugins add to it from a hidden prompt node under the node that hosts it, which `AppNode.makePrompt`, `AppNode.getPromptId` and `AppNode.PROMPT_TYPE` describe; contributors file app-graph actions on it with the `prompt` disposition. Every surface that hosts a chat article now passes its graph node as `nodeId`, which is where the prompt finds its host. `ObjectAction` is deprecated in favour of app-graph actions on the subject's node.
- Updated dependencies [d65fd2a]
- Updated dependencies [5d280a1]
- Updated dependencies [3f250b7]
- Updated dependencies [fc5e071]
- Updated dependencies [6f6547f]
- Updated dependencies [90a7f6e]
- Updated dependencies [c1f845f]
- Updated dependencies [9cb96c7]
- Updated dependencies [caa28b3]
- Updated dependencies [710da43]
- Updated dependencies [df16fba]
- Updated dependencies [e8029c3]
- Updated dependencies [f142d06]
- Updated dependencies [1924a44]
- Updated dependencies [782ee41]
- Updated dependencies [d7dc2fc]
- Updated dependencies [d105c19]
- Updated dependencies [e343467]
- Updated dependencies [04d5fb1]
- Updated dependencies [9a3313a]
- Updated dependencies [034e231]
- Updated dependencies [498840b]
- Updated dependencies [0590c11]
- Updated dependencies [9fe0e5c]
- Updated dependencies [aec19dd]
- Updated dependencies [a70fb5a]
- Updated dependencies [9bcc167]
- Updated dependencies [a245692]
- Updated dependencies [3aef671]
- Updated dependencies [f10c1dc]
- Updated dependencies [13bc40d]
- Updated dependencies [59b9d5a]
- Updated dependencies [7751052]
- Updated dependencies [545ee73]
- Updated dependencies [2bba392]
- Updated dependencies [9d66bcd]
- Updated dependencies [592fdad]
- Updated dependencies [49df146]
- Updated dependencies [a18cb35]
- Updated dependencies [ece15ab]
- Updated dependencies [6ba7a88]
- Updated dependencies [074e3e6]
- Updated dependencies [17a9e75]
- Updated dependencies [b46d89b]
- Updated dependencies [853663c]
- Updated dependencies [1f73ed2]
- Updated dependencies [691fe84]
- Updated dependencies [a843e27]
- Updated dependencies [45e1c93]
- Updated dependencies [03ee407]
- Updated dependencies [6fd1079]
- Updated dependencies [2d585c2]
- Updated dependencies [0166448]
- Updated dependencies [f86f10e]
- Updated dependencies [80c25fe]
- Updated dependencies [5970ed3]
- Updated dependencies [e99e717]
- Updated dependencies [bc5cea7]
- Updated dependencies [1a06754]
- Updated dependencies [aa1cde1]
- Updated dependencies [4fe25ee]
- Updated dependencies [c844016]
- Updated dependencies [f175a2d]
- Updated dependencies [a9793bf]
- Updated dependencies [ed0d367]
- Updated dependencies [2cebedc]
- Updated dependencies [7da5d17]
- Updated dependencies [8d7d5e1]
- Updated dependencies [4be51c3]
- Updated dependencies [f299590]
- Updated dependencies [ca2a4a8]
- Updated dependencies [02254b0]
- Updated dependencies [b159f41]
- Updated dependencies [97de470]
- Updated dependencies [3b37cd1]
- Updated dependencies [bdb73fb]
- Updated dependencies [39f6b21]
- Updated dependencies [d00cc85]
- Updated dependencies [0a14251]
- Updated dependencies [768db81]
- Updated dependencies [e7ca5d7]
- Updated dependencies [e1d537b]
- Updated dependencies [1a0fff1]
- Updated dependencies [c1c6cf4]
- Updated dependencies [6f27147]
- Updated dependencies [e67aa80]
- Updated dependencies [df65316]
  - @dxos/edge-client@0.17.0
  - @dxos/assistant@0.17.0
  - @dxos/echo@0.17.0
  - @dxos/app-toolkit@0.17.0
  - @dxos/app-graph@0.17.0
  - @dxos/app-framework@0.17.0
  - @dxos/react-ui@0.17.0
  - @dxos/plugin-space@0.17.0
  - @dxos/react-ui-form@0.17.0
  - @dxos/assistant-toolkit@0.17.0
  - @dxos/plugin-markdown@0.17.0
  - @dxos/client@0.17.0
  - @dxos/context@0.17.0
  - @dxos/ai@0.17.0
  - @dxos/ui-editor@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/types@0.17.0
  - @dxos/compute@0.17.0
  - @dxos/protocols@0.17.0
  - @dxos/react-ui-list@0.17.0
  - @dxos/plugin-explorer@0.17.0
  - @dxos/plugin-client@0.17.0
  - @dxos/react-ui-menu@0.17.0
  - @dxos/echo-react@0.17.0
  - @dxos/plugin-thread@0.17.0
  - @dxos/schema@0.17.0
  - @dxos/effect@0.17.0
  - @dxos/pipeline-rdf@0.17.0
  - @dxos/util@0.17.0
  - @dxos/halo@0.17.0
  - @dxos/halo-react@0.17.0
  - @dxos/ui-theme@0.17.0
  - @dxos/react-hooks@0.17.0
  - @dxos/brain@0.17.0
  - @dxos/log@0.17.0
  - @dxos/errors@0.17.0
  - @dxos/invariant@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [dc7785a]
- Updated dependencies [2f76f26]
  - @dxos/react-ui@0.16.0
  - @dxos/assistant@0.16.0
  - @dxos/echo@0.16.0
  - @dxos/plugin-space@0.16.0
  - @dxos/client@0.16.0
  - @dxos/plugin-client@0.16.0
  - @dxos/plugin-explorer@0.16.0
  - @dxos/plugin-markdown@0.16.0
  - @dxos/plugin-thread@0.16.0
  - @dxos/app-framework@0.16.0
  - @dxos/app-graph@0.16.0
  - @dxos/app-toolkit@0.16.0
  - @dxos/react-ui-form@0.16.0
  - @dxos/react-ui-list@0.16.0
  - @dxos/react-ui-menu@0.16.0
  - @dxos/compute@0.16.0
  - @dxos/echo-react@0.16.0
  - @dxos/schema@0.16.0
  - @dxos/types@0.16.0
  - @dxos/ui-editor@0.16.0
  - @dxos/ai@0.16.0
  - @dxos/pipeline-rdf@0.16.0
  - @dxos/halo@0.16.0
  - @dxos/brain@0.16.0
  - @dxos/halo-react@0.16.0
  - @dxos/context@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/errors@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/log@0.16.0
  - @dxos/util@0.16.0
  - @dxos/edge-client@0.16.0
  - @dxos/protocols@0.16.0
  - @dxos/react-hooks@0.16.0
  - @dxos/ui-theme@0.16.0

## 0.15.0

### Minor Changes

- 6897df1: Profile › Agents lists the agents you administer, read from their own spaces (`AgentSpace`), while the identities setting is on, each with a link to every space it shares with you. Settings › Agents › Add agent no longer adds a second agent when clicked again while EDGE provisions the first.
- 36d45ee: An agent's brain is named by `AgentPresence.brainId`: its identity's DID when it has one, and its id otherwise, as before. A watch records the agent it was set through (`Trigger.origin`), and an agent delivers only the watches set in its own space (`AgentPresence.delivers`); `TriggerOperation.RunDue` delivers whatever its space has queued.
- 278f49c: An agent's brain holds only facts: the agent remembers and recalls structured facts rather than free-text memories.

  - `@dxos/plugin-agent` (breaking): `MemoryOperation.Remember` is now `org.dxos.operation.agent.recordFacts` and takes `facts` — each a subject, a predicate from the seed ontology (listed in the tool's description), an entity `object` or a literal `value`, and optional `quote`, `origin`, `confidence` and `supersedes` — and returns their ids. `Recall` returns `facts` (now with an `id`) and `goals` only, leaving out superseded, retracted and expired facts. `Forget`, `RecalledMemory`, `Mode.records` and the `@dxos/plugin-agent/Knowledge` subpath are removed. Profiles group the facts about their subject by predicate, and the knowledge, state and profile panels show facts in place of memories. Memories already stored in a brain are no longer read.
  - `@dxos/pipeline-rdf`: exports `predicateSection`, the ontology's predicates as a prompt section.
  - `@dxos/plugin-agent`, `@dxos/plugin-discord`: a channel agent is told that an answer it only writes out is lost, so it delivers answers with its channel tools (Discord reply or direct message) instead of plain text.

- 3b03db7: An agent's brain on EDGE reads past a hundred facts, can be wiped, and shows its stored facts as highlighted TriG.

  - `@dxos/pipeline-rdf`: queries bind graph ids in chunks, so a store in a Cloudflare Durable Object (at most 100 bound parameters per statement) no longer fails with `too many SQL variables` once it holds about fifty facts.
  - `@dxos/plugin-agent`: `BrainService.reset` and the `ResetBrain` operation wipe an agent's facts, read cursors and queued events while keeping its watches; the knowledge panel's reset uses them, shows the brain loading or being wiped instead of an empty list, and lays out and highlights the raw TriG of each fact.
  - `@dxos/ui-editor`: `highlightTurtle` highlights Turtle or TriG without mounting an editor.

- 0507be5: An agent in a channel no longer has its written reply sent back where the message came from: it acts through tools its channel provides. A Discord channel's agent can reply in a channel or thread, send a direct message (to a user id, @handle or contact name) or react to a message; an email channel's agent sends email to its contacts and to anyone who has emailed it. Doing nothing is an option, and the agent may answer somewhere other than where it was asked. A channel declares its tools as a skill on its config type, which every conversation of the channel binds, so the agent core names no channel. Relayed messages are marked `outbound`, the only messages EDGE still posts on the agent's behalf.
- 36f4894: An agent on Discord relays through the Discord bot, which holds the token, so relays work where the space has none.

  - `@dxos/plugin-agent`: a relay is written into the recipient's conversation and posted by EDGE's Discord bot. It reaches a person in their Discord thread or a new DM before a Composer chat, and records the conversation it was asked in instead of asking the model for it. The Activity panel shows the agent's name and id, lists skills before channels and conversations in the order they started, and shows a channel missing from the space as one.
  - `@dxos/plugin-thread`: a channel backend can declare that a host posts what the agent writes (`ChannelBackendProvider.mirrored`).
  - `@dxos/plugin-discord`: connecting a Discord channel gives the agent a channel of its own, named after it; the package is published, with `@dxos/crawler` and `@dxos/pipeline-discord`.

- a941f0d: Agents can be set up on Discord and run community support there.

  - `@dxos/plugin-agent`: a built-in **Support** mode backed by a community-support skill (`SupportSkill`) answers from what the agent knows, records bug reports, and offers to ask the team member whose expertise fits a question it cannot answer, never asking for or repeating a secret. The agent's Activity panel has a toolbar (refresh, connect or disconnect its channels), lists channels, skills and conversations alike, and deleting a thread conversation deletes the thread on its backend too. The Knowledge panel's Reset forgets the agent's memories and goals.
  - `@dxos/plugin-thread`: a channel backend can delete a thread (`ChannelThreads.remove`, run by `ThreadOperation.DeleteThread`).
  - `@dxos/react-ui-components`: a `Section` composite (`Section.Root`, `Section.Label`, `Section.Empty`) gives a panel's labelled lists one heading style, aligned with list rows.
  - `@dxos/react-ui-debug`: `Logger.Root` takes a `buffer` prop, so a panel can show its own entries (`new LogBuffer()`, `append(entry)`) with the viewer's filtering, search and copy; rows centre their text, an open row keeps its header centred, and only one row is ringed at a time.
  - `@dxos/react-ui-assistant`: the Context panel above a prompt lays out its header like other disclosure panels.

- d071b94: Agents can have an email address: an Email channel (`AgentEmail` config: address, display name, allowed senders) claims `<handle>@dxos.ai` on EDGE when connected, and EDGE's compute-service routes each email thread into its own chat of the agent and mails the agent's replies. The channel's properties panel edits the address and sender allowlist and shows the mailbox status.
- 0880591: `AgentOperation.EnsureIdentity` gives an agent its own identity and a space it owns on EDGE, puts the caller in that space as an admin, and admits the agent to the shared space it was created in.
- c205da8: The agent's brain panel gains an Entities tab: everything its brain holds, as entity cards in Finder-style columns. Choosing a card, one of its rows or a chip opens what that relates to. Cards now take an entity's class from the type the brain stores for it, so people, organizations, places and events read apart without a caller-supplied type map.
- f3dc87f: Settings › Plugins › Agent › "Create identities for agents" (`AgentSettings.Settings.identities`) is off by default. With it on, Settings › Agents › Add agent gives the new agent its identity on EDGE, and opening an agent finishes, for its creator, a join whose retries all failed. With it off, agents are created as before.
- 5387dc8: An agent's admins can add it to their other spaces from a space's Members › "Add from contacts" picker, where it is listed as a contact, while plugin-agent's "Create identities for agents" setting is on. Once its identity is admitted, the admin's client registers the space with EDGE and makes the agent's presence there (`AgentOperation.InviteAgent`). The agent keeps one brain across the spaces it is in, and each member keeps one conversation with it, which opening the agent in any of those spaces continues.
- bc72a37: Facts are stored as statements in named graphs that state their provenance once, with predicates from an extensible ontology (`RDF.Ontology`) and entities keyed by real IRIs where one is known; a store from an earlier release migrates on open. Breaking: plugin-agent's `Memory` ECHO type is removed, since memories are now graphs in the agent's brain (`Knowledge`), recalled and superseded by id and withdrawn with the new Forget operation.
- a6cba78: `MemoryOperation.Recall` is now `org.dxos.operation.agent.retrieveFacts`, so agents see a `retrieveFacts` tool. Breaking for stored tool keys: a skill, blueprint or trigger that names `org.dxos.operation.agent.retrieveMemories` must use the new key, since no alias is kept.
- 35030a7: Fact extraction now reuses existing predicates and stable entity IRIs. The extractor is shown every predicate the brain knows and the known entities by name. A predicate it has to invent is minted in the brain's own namespace with a definition, and stored as an `rdf:Property` in the ontology graph (`FactStore.predicates`). Every fact store now starts with the seed vocabulary (schema.org, FOAF, Dublin Core, SKOS and RDF predicates; `is a` is `rdf:type`) and gets it back when cleared. A mention resolved to no stable IRI is local to the graph that mentions it. The agent knowledge panel gains a Predicates tab. Breaking: new facts are stored with different predicate and class IRIs (the former `dx:` IRIs stay equivalent, so older facts still match), and `FactStoreApi` gains `predicates`.
- 55bdf55: The agent's fact graph can be browsed as entity cards, with Turtle and TriG highlighted in the editor.

  - `@dxos/plugin-agent`: `EntityCard` shows one entity of the fact graph (its type, name, properties, and the properties pointing at it, with chips coloured by type), and `EntityBrowser` explores the graph as Finder-style columns, each with a filter, a close action and arrow-key navigation.
  - `@dxos/pipeline-rdf`: `Predicate.label` writes a predicate or an inverse in one display form, lowercase kebab-case (`works-at`, `known-by`).
  - `@dxos/ui-editor`: `turtle()` highlights RDF 1.1 Turtle and TriG (prefixes, IRIs, prefixed names, blank nodes, literals with language tags and datatypes, graph blocks).
  - `@dxos/react-ui`: a chosen card in a keyboard stack (a `Focus.Item`) shows the current surface rather than the accent border, so the focus ring is the only edge it draws.

### Patch Changes

- a6195f2: An agent has one email address: creating an email channel for an agent that already has one returns that channel instead of adding a second.
- 191dd14: The agent knowledge panel highlights the raw TriG of the Facts prefixes and the Predicates ontology, as it already did for each fact.
- 3bd183a: Recall finds what an agent knows about a person across sources: entities tied by a strong identifier (an account such as a Discord username, an email address, a same-as statement, or the person's own ECHO URI, DID and identities) are recalled as one, while names alone still never merge two people. Activity's channel rows show the backend's summary, such as an email channel's address.
- 2a28b3a: Agents recall what they were told more reliably: a nickname, handle or unique first name resolves to the person already known instead of creating a duplicate, a recall query matches by word and falls back to everything about the subject when it matches nothing, negated facts read back as "not:", and facts are no longer extracted from the agent's own replies or from a prompt the chat feed holds twice.
- 9b93ba2: Recall no longer attributes someone else's facts to a person: it widens a subject only by strong identifiers (its URI, DID and account identities), never by a name that happens to be another person's handle, and an account link that is denied, uncertain or expired no longer ties two entities together.
- 20611d2: Agent recall matches query words at word starts (so "Ann" no longer finds "Joanne"), and a name an agent resolves never picks between two people who share a nickname or first name.
- 1f72729: - `@dxos/plugin-deck`: the companion comes back after leaving fullscreen (ending a presentation), instead of staying hidden until a reload.
  - `@dxos/plugin-agent`: a relay only uses the agent's current channels, and a DM the backend refuses falls through to the Composer chat.
- 0d81167: Hand-built agent panels follow the form's layout, and the entity browser slots into its host.

  - `@dxos/react-ui-components`: **Breaking:** `Section` is removed; build a labelled group with react-ui's `Fieldset.Root` and `Fieldset.Legend` (the form's label row) instead.
  - `@dxos/plugin-agent`: the Activity panel lays out its groups in the form's frame (`Form.Viewport`, `Fieldset`). `AgentKnowledge.Browser` (`EntityBrowser`) is composable, its horizontal scroll frame the root, so a host's `Panel.Body asChild` slots onto it instead of nesting a second panel. Predicate cards title each predicate in kebab case, as the entity cards key it. The email channel's settings are a panel whose header toolbar reads "Email" with one connect/disconnect toggle, as Activity's, and the form scrolls beneath it.
  - `@dxos/plugin-discord`: the Discord setup panel uses the same form frame and `Fieldset` groups. Its toolbar links to the hub console's Discord page for the EDGE environment the client is configured with.
  - `@dxos/plugin-client`: recovery credentials show when each was issued to the minute on a 24-hour clock, and a revoked one is marked by its strikethrough alone.
  - `@dxos/react-ui`: `Layout.Columns` lays out a horizontal run of columns sized to whole shares of the space (as many as fit at a minimum width, each an exact fraction), scrolling a column at a time and following the newest. `Status.Empty` reads at the label's size (`text-sm` by default), so every empty state is the same secondary text. Overlay scroll thumbs sit flush with the ends of their track, as they already did with its side. A tag in a start-aligned card row centres on the first line, as text does.

- Updated dependencies [278f49c]
- Updated dependencies [3b03db7]
- Updated dependencies [bc72a37]
- Updated dependencies [6488905]
- Updated dependencies [3d151fc]
- Updated dependencies [ab27b41]
- Updated dependencies [9b2a2c0]
- Updated dependencies [94ec06d]
- Updated dependencies [419bf9a]
- Updated dependencies [3aed53a]
- Updated dependencies [ed8df23]
- Updated dependencies [0f6457d]
- Updated dependencies [94d4f85]
- Updated dependencies [b6ae19d]
- Updated dependencies [d84f9b8]
- Updated dependencies [b82150a]
- Updated dependencies [0420f87]
- Updated dependencies [cd70a43]
- Updated dependencies [0d81167]
- Updated dependencies [71fc002]
- Updated dependencies [1b33a84]
- Updated dependencies [16bde33]
- Updated dependencies [417247b]
- Updated dependencies [1bc475e]
- Updated dependencies [d250ed2]
- Updated dependencies [ef9aea9]
- Updated dependencies [35030a7]
- Updated dependencies [55bdf55]
- Updated dependencies [ed1039a]
- Updated dependencies [9b9a4ca]
- Updated dependencies [b7fe13f]
- Updated dependencies [37edd53]
- Updated dependencies [098a536]
- Updated dependencies [6a02061]
- Updated dependencies [1bddc93]
- Updated dependencies [25af912]
- Updated dependencies [2208806]
- Updated dependencies [7b47951]
- Updated dependencies [8190cc5]
- Updated dependencies [60ef4ec]
- Updated dependencies [2b6a93a]
- Updated dependencies [743604d]
  - @dxos/pipeline-rdf@0.15.0
  - @dxos/ui-editor@0.15.0
  - @dxos/assistant@0.15.0
  - @dxos/plugin-space@0.15.0
  - @dxos/react-ui@0.15.0
  - @dxos/echo@0.15.0
  - @dxos/compute@0.15.0
  - @dxos/edge-client@0.15.0
  - @dxos/app-framework@0.15.0
  - @dxos/protocols@0.15.0
  - @dxos/ai@0.15.0
  - @dxos/plugin-client@0.15.0
  - @dxos/plugin-markdown@0.15.0
  - @dxos/app-toolkit@0.15.0
  - @dxos/echo-react@0.15.0
  - @dxos/client@0.15.0
  - @dxos/brain@0.15.0
  - @dxos/react-ui-form@0.15.0
  - @dxos/plugin-explorer@0.15.0
  - @dxos/plugin-thread@0.15.0
  - @dxos/app-graph@0.15.0
  - @dxos/react-ui-list@0.15.0
  - @dxos/react-ui-menu@0.15.0
  - @dxos/schema@0.15.0
  - @dxos/types@0.15.0
  - @dxos/halo@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/react-hooks@0.15.0
  - @dxos/halo-react@0.15.0
  - @dxos/util@0.15.0
  - @dxos/context@0.15.0
  - @dxos/errors@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/keys@0.15.0
  - @dxos/log@0.15.0
  - @dxos/ui-theme@0.15.0

## 0.14.0

### Minor Changes

- 62abfd7: An agent gains a "Brain store" companion: a read-only debug view of its brain as held, showing the raw facts with full attribution, each watch's rules, the facts encoded as the Datalog relations those rules match, and each watch's pending events with when the clock next matters. It reads the brain through the new `TriggerOperation.InspectBrain`, and `@dxos/brain` adds `Encoding.format` and `Encoding.formatEntry` to print encoded facts in the rules dialect.
- f0fc12a: An agent's chats now run on EDGE (`Agent.chatLocation`) unless a chat sets `remote: false`, so every chat shares the agent's one brain. Facts the agent records are attributed to space members by identity DID, with the display name as an optional label (`attribution.agentLabel`), and watches resolve the person they name to that member's DID and match on it (someone who is no member is matched by name, as their words are attributed); a chat with a member no longer invents a placeholder "Me" person.
- 469e811: An agent's extracted facts now live only in its brain (`BrainService`): reading a chat or a document no longer writes `FactEntry`/`ExtractionPass` items to an annotation feed in the space, and documents read with `ReadSource` now wake watches as chat turns do. Breaking: the `@dxos/plugin-agent/FactEntry` export is removed, `ReadSource` returns `fired`/`undelivered` instead of a `pass` ref, `BrainService` gains `readThrough` and a `read` push option (the chat read cursor, kept with the facts), and annotation feeds already in a space are no longer read.
- 37b0196: `@dxos/brain` gains `Evaluator`, which evaluates every subscription of one brain with `GoalRules` over a shared fact stream (`push`, `tick`, `hydrate`, `nextDueAt`), and `Oracle`, the replay gate a compiled goal must pass. `GoalRules.nextDueAt` reports when the clock next matters, `every` fires once per period even when every evaluation falls on a boundary, and `about` also matches an entity's label. plugin-agent's in-memory brain now evaluates subscriptions with the `Evaluator`: a `Trigger` carries `rules`, compiled from the goal's text by `WatchFacts` (gated by the oracle, naming the space's members by DID) or translated from its `FactPattern` by `Trigger.toRules`, replacing `Trigger.matchesPattern` and `BrainService.matchEvent`. `BrainService` events carry the wake's label and facts, and the service gains `tick` and `nextDueAt`; `TriggerOperation.RunDue` runs due watches.

### Patch Changes

- f20db7f: An agent watch no longer notifies its recipient about something they said themselves, refuses a watch that would only ever do so, and sends nothing for a watch cancelled while its update was being written.
- 2d0a302: The in-memory brain wakes a chat where the chat runs (`Agent.chatLocation`), so an agent chat on EDGE no longer gets a second, local session when a watch fires.
- Updated dependencies [62abfd7]
- Updated dependencies [f0fc12a]
- Updated dependencies [0715304]
- Updated dependencies [37b0196]
- Updated dependencies [085dcb1]
- Updated dependencies [b0e4b60]
- Updated dependencies [fd09131]
- Updated dependencies [508be04]
- Updated dependencies [347546a]
- Updated dependencies [ec6da5a]
- Updated dependencies [a1e64db]
- Updated dependencies [28bb45b]
- Updated dependencies [1eed6b1]
- Updated dependencies [6847fe2]
- Updated dependencies [3e98467]
- Updated dependencies [1819960]
- Updated dependencies [eb5d14d]
- Updated dependencies [27b542c]
- Updated dependencies [4820c02]
- Updated dependencies [5324de6]
- Updated dependencies [b07f49f]
  - @dxos/brain@0.14.0
  - @dxos/assistant@0.14.0
  - @dxos/app-framework@0.14.0
  - @dxos/plugin-markdown@0.14.0
  - @dxos/react-ui-form@0.14.0
  - @dxos/react-ui@0.14.0
  - @dxos/react-ui-list@0.14.0
  - @dxos/compute@0.14.0
  - @dxos/echo@0.14.0
  - @dxos/effect@0.14.0
  - @dxos/ui-theme@0.14.0
  - @dxos/plugin-explorer@0.14.0
  - @dxos/plugin-thread@0.14.0
  - @dxos/app-toolkit@0.14.0
  - @dxos/app-graph@0.14.0
  - @dxos/react-ui-menu@0.14.0
  - @dxos/ai@0.14.0
  - @dxos/echo-react@0.14.0
  - @dxos/schema@0.14.0
  - @dxos/types@0.14.0
  - @dxos/pipeline-rdf@0.14.0
  - @dxos/halo@0.14.0
  - @dxos/halo-react@0.14.0
  - @dxos/errors@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Minor Changes

- bbe9f18: Agents gain a brain: each member talks to an agent in their own private chat, the agent records facts from every turn in an RDF fact store and watches them against the goals people set, and a matching fact wakes the requester's chat with an update, relayed as a synthetic system note. The brain runs in memory locally and as a SQLite Durable Object on EDGE. Fact extraction now works with Anthropic structured output, and `@dxos/compute` adds `Process.EnvironmentService`, and `Process.currentEnvironment`.
- 388bcc1: `BrainService` splits into a knowledge base and an event base: `push` stores facts and queues an event in the outbox of every subscription they match, `query` reads facts back, and consumers drain each subscription with `take` and `ack` (`subscribe`, `subscriptions` and `unsubscribe` manage them). This replaces `addFacts`, `queryFacts`, `putTrigger`, `listTriggers` and `removeTrigger`. Fact matching moves to `Trigger.matchesPattern`, and `BrainService.matchEvent` lets a remote brain match the same way. Opening an agent's page directly no longer fails to open the private chat the first time.
- 246ee3c: Add `@dxos/plugin-agent`, an agent that talks to people through any channel, remembers them as ECHO objects, reads every conversation turn into facts, relays messages, and keeps one-time and ongoing ("keep me posted") watches whose updates it writes from the conversation's context. Every subpath of the package is a namespace: `AgentState` and `AgentKnowledge` (each with a `Root` container), one per skill (`ConversationSkill`, `GoalsSkill`, `InterviewSkill`, `ModesSkill`, `NoteTakerSkill`, `RelaySkill`), and one per type and operation set.

  `@dxos/plugin-thread` channel backends can now open direct conversations (`openDirect`), post into threads (`threads.send`), run a connection (`connection.start`/`stop`/`status`), and return a send receipt. New operations `sendToChannel`, `openDirect`, `connectChannel`, `disconnectChannel` and `getChannelStatus` dispatch to them, and the handlers are published as the `ThreadOperationHandlerSet` subpath. The Discord and Slack plugins implement these backends.

  An agent prompt can name its sender: `AgentProcess` accepts `{ prompt, sender?, properties? }` as well as a bare prompt (`AgentInput`, `makeInputMessage`), `AgentService.Session.submitPrompt` and the assistant's request and session take a `sender`, and the model sees a named sender as `[From: <name>]`. `useChatProcessor` and `AiChatProcessor` take a `sender`, and `ChatThread` takes a `userHue`.

  `Agent.loadChat` no longer picks a chat bridged from an external conversation as the agent's primary chat, and finds chats with a child-of filter so it also works on EDGE. `Agent.makeInitialized` accepts a skill ref, and `Skill.makeRef` binds a database skill as-is and any other by registry URI.

  The `ProfileOf` relation moves from `@dxos/plugin-crm` to `@dxos/types` with its typename unchanged, so existing profiles still resolve. `EdgeHttpClient.request` makes an authenticated call to any EDGE route. `pipeline-rdf` exports `DEFAULT_MODEL`. `FormInlineAnnotation` now survives the JSON-schema round trip. A plugin that declares two modules with the same id now fails when it is constructed instead of silently dropping one.

### Patch Changes

- Updated dependencies [ecd099a]
- Updated dependencies [bbe9f18]
- Updated dependencies [d2a6aad]
- Updated dependencies [162fd6d]
- Updated dependencies [aad3e41]
- Updated dependencies [44b7b80]
- Updated dependencies [bb2b672]
- Updated dependencies [c6922ce]
- Updated dependencies [cb1e218]
- Updated dependencies [1ef899b]
- Updated dependencies [1b2e9f3]
- Updated dependencies [5a27d5c]
- Updated dependencies [32f32a0]
- Updated dependencies [dc16fdd]
- Updated dependencies [66727e3]
- Updated dependencies [469e7f7]
- Updated dependencies [665261a]
- Updated dependencies [68dc875]
- Updated dependencies [2e96a73]
- Updated dependencies [ec9f207]
- Updated dependencies [945092e]
- Updated dependencies [c531b05]
- Updated dependencies [eb14798]
- Updated dependencies [3672aff]
- Updated dependencies [2f95d25]
- Updated dependencies [69a4a85]
- Updated dependencies [c7cc480]
- Updated dependencies [7d222fc]
- Updated dependencies [e99ee70]
- Updated dependencies [161f994]
- Updated dependencies [ff92c50]
- Updated dependencies [3e73e53]
- Updated dependencies [9ab98cd]
- Updated dependencies [8fc641a]
- Updated dependencies [38e2ddb]
- Updated dependencies [1894fc1]
- Updated dependencies [246ee3c]
- Updated dependencies [8ebe8d6]
- Updated dependencies [596728d]
- Updated dependencies [64f1a7a]
- Updated dependencies [7715216]
- Updated dependencies [1b37aa8]
- Updated dependencies [1737cad]
- Updated dependencies [321c99f]
- Updated dependencies [6a7bed4]
- Updated dependencies [3022878]
- Updated dependencies [c2a300a]
- Updated dependencies [17008f0]
- Updated dependencies [6ea9d4d]
- Updated dependencies [dde8f43]
- Updated dependencies [4f8e566]
- Updated dependencies [fcbb5c4]
- Updated dependencies [a449958]
- Updated dependencies [49731e1]
  - @dxos/react-ui-menu@0.13.0
  - @dxos/compute@0.13.0
  - @dxos/react-ui@0.13.0
  - @dxos/echo@0.13.0
  - @dxos/react-ui-form@0.13.0
  - @dxos/ai@0.13.0
  - @dxos/util@0.13.0
  - @dxos/types@0.13.0
  - @dxos/plugin-markdown@0.13.0
  - @dxos/app-toolkit@0.13.0
  - @dxos/app-framework@0.13.0
  - @dxos/assistant@0.13.0
  - @dxos/pipeline-rdf@0.13.0
  - @dxos/plugin-thread@0.13.0
  - @dxos/plugin-explorer@0.13.0
  - @dxos/app-graph@0.13.0
  - @dxos/react-ui-list@0.13.0
  - @dxos/echo-react@0.13.0
  - @dxos/schema@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/halo-react@0.13.0
  - @dxos/errors@0.13.0
  - @dxos/keys@0.13.0
  - @dxos/ui-theme@0.13.0
