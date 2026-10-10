# Agent Brain — Prototype 1

Composer project: **Agents** (DXOS space), milestone **M4**. Decision log: [DECISIONS.md](./DECISIONS.md).
Builds on Rich's plugin-agent (`AgentPlayground` story, commit 246ee3ce): facts (pipeline-rdf `FactEntry`
feeds), goals (`Goal`), watches (`Trigger`), relay (`sendMessage`).

## What changes

| Piece                               | Before                                                               | Prototype 1                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Watches ("goals" the agent acts on) | module-level `triggerRegistry` (process memory; per isolate on EDGE) | `BrainService` triggers                                                                           |
| Fact index                          | annotation feeds read back and filtered in JS                        | `BrainService.addFacts` → pipeline-rdf `FactStore` (RDF triples); feeds stay the audit trail      |
| Relay into a person's Composer chat | appends an assistant message (no turn)                               | `BrainService.wake` submits a synthetic user message to that chat's session, so the agent replies |
| Chat privacy                        | `ChatParticipant` (person id)                                        | + `ChatOwner` annotation (identity DID); UI shows a member only their own private chat            |
| End-of-turn hook on EDGE            | dropped (`listSkills` carries no hooks)                              | hooks cross the wire; `runTriggers` runs after every hosted turn                                  |

## BrainService

`@dxos/plugin-agent/BrainService` — an Effect service, one per agent (keyed by agent id):

```ts
interface BrainService {
  facts: { add(agentId, facts: Fact[]); query(agentId, SemanticQuery): Fact[] }; // RDF store
  triggers: { put(trigger); list(agentId); remove(id): boolean }; // goal watches
  wake(request: { chat: Chat; prompt: string; sender?: PromptSender }): void; // activate a chat
}
```

- **local** (`BrainService.layerMemory`): pipeline-rdf memory `FactStore` per agent + in-memory triggers;
  `wake` = `AgentService.getSession(chat).submitPrompt(...)`, forked so the waking turn is not blocked.
  Not persistent (stated limitation).
- **edge** (`dxos/edge` compute-service): `BrainObject` Durable Object per agent with SQLite —
  pipeline-rdf `FactStoreLive.layer` over `@effect/sql-sqlite-do`, a `triggers` table and a `wakes`
  outbox drained by an alarm (spawn the chat's `AgentProcess`, `submitInput`) so a relay never blocks
  the turn that sent it. Reached from operation-service through `BrainServiceEntrypoint` (service
  binding), and from clients through `GET /brain/:spaceId/:agentId`.

## Flow (E2E 1)

1. Alice (private chat): "keep me posted about what Bob is working on" → `watchFacts` → `Goal`
   (ECHO, shown in the companion) + brain trigger `{ speaker: Bob }`.
2. Bob (private chat): "I'm working on X" → end-of-turn hook `runTriggers` → `readSource` extracts
   facts → `brain.facts.add` → match against `brain.triggers.list` → compose update →
   `sendMessage` → `brain.wake(Alice's chat, "[Update for Alice] …")`.
3. Alice's chat runs a turn on the synthetic message; the agent's reply is the message Alice gets.

## Tests (one spec, two environments)

`plugin-agent/src/brain/brain.test.ts` (local: AssistantTestLayer, scripted model, memory brain) and
`plugin-agent/src/brain/brain.edge.test.ts` (edge-local: real client against `wrangler dev`, agent
processes on EDGE, real model): E2E 1, Facts 1, Goals 1.

## Limitations (as specified)

Only private chats; agent chats always run on EDGE in Composer; local fact store not persistent;
privacy is a UI filter (ECHO has no per-object ACL yet).
