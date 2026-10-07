# plugin-agent — Tasks

_Resume: Phase 3 — approve M0 (child feed per private thread, THREADS.md), then M2 on `@dxos/brain`. In flight: one feed item per fact; GoalCompiler UI fixes + Datalog highlighting. Uncommitted: none. Last: `FactTuple` removed (`RDF.Fact` with tagged `Term` is the only fact type); goal state projected into the index._

Composer project: **Agents** (DXOS space). Design: [docs/DESIGN.md](./docs/DESIGN.md), brain: [docs/BRAIN.md](./docs/BRAIN.md), ontology:
[docs/ONTOLOGY.md](./docs/ONTOLOGY.md), memory: [docs/MEMORY.md](./docs/MEMORY.md), testing:
[docs/TESTING.md](./docs/TESTING.md), Discord setup: [docs/SETUP.md](./docs/SETUP.md).

## Phase 1: Discord ↔ agent ↔ Composer spike

An agent (Kai) with its own identity talks in Discord threads and Composer chats, shares one memory
across them, relays messages between people and watches facts for the people who asked.

### Tasks

- [x] **Agent plugin** — Agent article, Discord binding, bot status, skills (conversation, modes, relay, goals, interview, note-taker).
- [x] **EDGE Discord bot** — `DiscordBot` Durable Object, gateway, inbox, thread ↔ chat mapping, mention gating (dxos/edge#1226).
- [x] **Facts** — `readSource` reads documents and chats into per-source annotation feeds (pipeline-rdf shape); recall over facts.
- [x] **Goals and watches** — `watchFacts` (one-time and ongoing), in-memory trigger registry, end-of-turn `runTriggers`, updates composed under `RELAY_RULES`.
- [x] **Stories** — AgentPlayground (scripted keep-me-posted exchange, Goals), AgentConversation (live, turn by turn).
- [x] **Publish** — plugin-agent public; `ProfileOf` moved to `@dxos/types`; plugin-crm private again.
- [x] **react-ui cutover** — components migrated to the Ark-based react-ui.
- [ ] **Fire watches on every fact** — call `fireTriggers` from `readSource`'s `record`, so document reads and synced facts fire watches, not only chat turns.
- [ ] **plugin-agent on EDGE** — edge `fa1062e8` deferred the operation-service registration until a dxos build carries both main and this branch; re-pin with `scripts/bump-dxos-catalog.mjs` and re-apply `d5c5a9a4` (or `pnpm link-packages` locally).
- [ ] **DESIGN.md draft 5** — rename to Agent, the fact/watch flow as built, current gaps; mark what facts replace in MEMORY.md; add AgentConversation to TESTING.md.
- [ ] **Agentic review** — run `bun .agents/skills/agentic-review/scripts/fast.ts` (needs `TYPESAFE_API_KEY`), commit the store, work the index.
- [ ] **Model Fixture CI** — failing on main too; read the Depot log and fix upstream.

## Phase 2: channel-agnostic agents

plugin-agent loses every Discord-specific operation; agents use plugin-thread's `ChannelBackend`,
implemented by plugin-discord, plugin-slack, plugin-freeq, plugin-bluesky. Design: DESIGN.md "Channel-agnostic
agents".

### Tasks

- [x] **Backends depend on plugin-thread** — plugin-freeq and plugin-bluesky `dependsOn: ['org.dxos.plugin.thread']` (2ded7e8d518).
- [x] **Extend `ChannelBackendProvider`** — optional `openDirect`, `threads`, `connection`; generic `sendToChannel`, `openDirect`, `connectChannel`/`disconnectChannel`/`getChannelStatus` operations in plugin-thread.
- [x] **Discord `ChannelBackend`** — plugin-discord implements it (`send`, `threads`, `openDirect`, `connection` over the EDGE bot routes) on a `DiscordChannel` config and `dependsOn` plugin-thread; takes over the binding form and bot status as the Discord channel's ObjectProperties surface.
- [x] **plugin-agent on channels** — `AgentChannels`, `ensureChannelChat`, `Relay.replyChannel` (Relay 0.2.0, no migration), channel-based `sendMessage`; deleted `sendDiscordMessage`, `start/stop/getDiscordBotStatus`, `ensureThreadChat`, `DiscordBinding`.
- [x] **Slack `ChannelBackend`** — plugin-slack implements it (`send`/`threads.send` via `chat.postMessage` as the connection's bot token, `openDirect` from a `slack` identity via `conversations.open`) on a `SlackChannel` config that owns the sync's mirror feed; posts are mirrored by `ts` and the sync de-dups them; existing feed-backed Slack channels are upgraded on sync/materialize; `chat:write` + `im:write` scopes (existing connections must reconnect to post).
- [ ] **Slack real-time receiving on EDGE** — Events API or Socket Mode worker that turns Slack messages into agent turns (`ensureChannelChat`); until then Slack messages arrive only through the connector's sync and reach no agent.
- [ ] **EDGE bot passes `Channel` refs** — reads the `DiscordChannel` config named by `PUT { binding, channel }`, resolves the agent through `AgentChannels`, calls `ensureChannelChat` (edge PR). Discord messages do not reach the agent until this lands.
- [ ] **Stories on a feed channel** — the playground exercises the agent through the same capability.

## Phase 3: Agent Brain

One brain per agent on EDGE: facts as RDF tuples in feeds, goals as hierarchical directives compiled
to Datalog, judged in private threads. Design: [docs/BRAIN.md](./docs/BRAIN.md). Supersedes the
in-memory trigger registry ("durable triggers").

### Tasks

- [ ] **M0 Private threads** — a session feed carries threads the chat view hides; agent-runtime runs a turn inside one. Researched: child feed per thread (design B) recommended, awaiting approval.
- [x] **M1 Goal compilation spike** — Datalog confirmed; 6/8 goals compile reliably on Sonnet; replay (not read-back) catches miscompiles. Findings in BRAIN.md "M1 findings".
- [x] **Engine and brain packages** — `@dxos/datalog` and `@dxos/brain` (public; 0.0.1 placeholders on npm, set up trusted publishing before 0.12.0); `CompilePrompt`; the eight scenarios as tests; GoalCompiler story.
- [x] **pipeline-rdf as the common type** — `RDF.Vocab` / `RDF.Mapping` / `RDF.Predicate` exported; illocution kept in the RDF mapping; `Term` tagged (`kind`) so facts store in ECHO; `pass` on `Fact`; `FactTuple` removed.
- [ ] **One feed item per fact** — `FactEntry { fact }` (0.2.0, no migration: chats re-read) with extraction-pass markers for atomicity and resume; `forgetFact`. In progress.
- [ ] **Goal state in the index** — project `goal(G, owner|status|priority, …)`, `subgoal(P, C)` and task links as derived facts (BRAIN.md "State").
- [ ] **M2 Facts and goals, in-process** — one fact per feed item; hierarchical `Goal` directives with feeds; Datalog engine; judgment in the session's private thread.
- [ ] **M3 Brain on EDGE** — Durable Object per agent: follows feeds, wake rules, alarms, background sessions per actor; agent service routing.
- [ ] **M4 Planning and constraints** — sub-goals, action drivers, session → durable promotion.
- [ ] **M5 Pattern library and evals** — goal-pattern skill, eval personas, cost controls.
- [ ] **Directive types** — `Instruction` / `Preference` / `Concept` (ONTOLOGY.md §4); reconcile with goals as directives.
- [ ] **Recall via SPARQL** — load fact feeds into pipeline-rdf's store for judgment-time retrieval.
- [ ] **Speakers as Person refs** — attribute facts to Person DXNs rather than name ids.
- [ ] **readSource for URLs** — fetch page text when only a URL is given.

### References

- dxos/dxos#13590 (Phases 1–2), dxos/edge#1226 (Discord bot), dxos/dxos#13762 (BRAIN.md), dxos/dxos#13766 (M1, packages), [docs/THREADS.md](./docs/THREADS.md).
