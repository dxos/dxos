# Interlocutor — design

Status: draft 3 (2026-10-03) — architecture as built for the first spike. Memory model:
[MEMORY.md](./MEMORY.md). EDGE half: dxos/edge `compute-service/src/discord/` and that repo's
`.agents/projects/interlocutor/DESIGN.md`.

## What it is

An interlocutor is an autonomous agent with its own name and identity (DID). It talks to people in
Discord and in Composer, learns who they are, keeps a profile of each user and team with their
individual and shared goals, relays information between them, and does basic tasks using the skills
of the spaces it belongs to. `plugin-agent` creates and manages agent instances in a space,
and controls each agent's Discord bot.

## Architecture

Two loops share one ECHO space: a control loop (Composer configures and starts a bot on EDGE) and a
conversation loop (Discord ↔ EDGE ↔ the agent). Memory lives as ECHO objects in that space, so
Discord threads and Composer chats see the same knowledge.

```
 Composer (browser)                    EDGE (Cloudflare)                                  Discord
 ──────────────────                    ─────────────────                                  ───────
 Agent + DiscordBinding form
   │ Start ─ startDiscordBot ─ PUT /compute/discord/bots/:appId ─▶ compute-service
   │   (EdgeHttpClient.request, signed with the user's identity)  ├ edgeAuth + space membership
   │                                                              └▶ DiscordBot DO (one per bot)
   │                                                                  ├ reads DiscordBinding + AccessToken (DataService)
   │                                                                  ├ gateway websocket ◀───────────── MESSAGE_CREATE
   │                                                                  ├ SQLite inbox → alarm drains in order
   │                                                                  ├ ensureThreadChat ─▶ operation-service
   │                                                                  │                      (Chat per thread, child of Agent)
   │                                                                  ├ spawn AgentProcess + submitInput(AgentInput)
   │                                                                  │     └▶ model + skills → tool calls → ECHO writes
   │                                                                  └ mirror: new assistant Messages ── REST ──▶ thread reply
   │
   └ Chat article / Profile panel ◀── replication ── ECHO space: Agent, Chats, Person, Goal, Memory, profile doc
```

### 1. Setup (Composer)

- `createAgent` makes an `Agent` (instructions, primary chat, the agent-conversation and interview skills).
- The agent's **Activity** companion carries a `DiscordBinding` form: `{ agent, accessToken, applicationId,
guildId?, channels }`, parented to the agent. The bot token is an `AccessToken` object.
- Start / Stop / Refresh invoke `startDiscordBot` / `stopDiscordBot` / `getDiscordBotStatus`, which
  call `PUT` / `DELETE` / `GET /compute/discord/bots/:appId` through `EdgeHttpClient.request`, a
  generic call signed with the identity's verifiable presentation. `PUT` sends
  `{ spaceId, binding: "echo://<space>/<bindingId>" }`; every verb returns `DiscordBotStatus`
  (`running`, `gateway`, `threads`, `lastError`…), shown under the form and polled every 5 s. The
  same companion lists the agent's Discord thread chats. These operations are
  browser-only: they need the user's identity, so the EDGE build of the plugin leaves them out.

### 2. Inbound (Discord → agent)

1. compute-service routes to the `DiscordBot` Durable Object keyed by application id. It reads the
   binding and the token from the space with DataService (a managed token resolves through KMS) and
   caches them in SQLite with the gateway session and the thread map. The ECHO binding is the source
   of truth; `DELETE` stops the gateway but keeps that cache.
2. The DO holds the gateway websocket (heartbeat, IDENTIFY / RESUME, a 30 s watchdog alarm for
   eviction).
3. Each `MESSAGE_CREATE` from a person in a bound channel (or a thread under one) is appended to a
   SQLite inbox, and an immediate alarm drains it in order. Gateway events arrive outside any
   request, where the DO cannot call other services, so the work runs in the alarm; draining in order
   also serializes each thread.
4. A message outside a thread starts a thread. The DO invokes `ensureThreadChat` on
   operation-service: the `Chat` with meta key `{ source: 'discord.com', id: threadId }` under the
   agent, created on a miss with the agent's skills and context. It returns `{ chat, feed }`.
5. The DO spawns an `AgentProcess` for the chat (idempotency key per chat) and calls `submitInput`
   with `AgentInput` `{ prompt, sender: { name }, properties: { discord: { userId, messageId,
threadId } } }`. The message lands on the chat feed with its author, and the model sees
   `[From: <name>]` ahead of the text. (Feed triggers do not advance a process, so spawning is how the
   agent wakes.)

### 3. Agent turn

`AgentProcess` runs the model with the agent's instructions and skills. On EDGE, tools resolve from
the operations registered in operation-service, which include plugin-agent's. The interview
skill writes the graph as it goes — `resolveEntity`, `recordMemory`, `suggestGoal`,
`setGoalStatus`, `updateProfile` (see [MEMORY.md](./MEMORY.md)).

### 4. Outbound (agent → Discord)

The DO reads new assistant messages from the chat feed after a cursor and posts their text to the
thread with Discord REST and the bot token. A `SendDiscordMessage` tool the agent calls itself is
the follow-up; it needs hosted tool calls to resolve managed tokens.

### 5. Composer

Every chat — the agent's primary chat and one per Discord thread — is a child of the one `Agent`, so
they share instructions, skills and memory. `Agent.loadChat` skips chats carrying a foreign key, so a
thread never becomes the primary chat. Person and Organization properties show the profile panel
(goals and memories, live).

## Spaces

- **Home space.** Each agent owns one space holding its `Agent` object, its chats, the profiles it
  builds and its memory. That's where the agent's state lives, regardless of who it talks to.
- **Joined spaces** (not built). An agent may be invited into other spaces. There it reads and writes
  as a member and binds that space's skills into the sessions it runs for that space. Today skills
  bind to a chat explicitly (`AiContext.Binder`); the agent needs "all skills of the spaces I'm in"
  as a resolved list.

## Identity

- **Now.** The agent's DID is `Agent.did`: a `did:halo:` string with no keypair behind it, per the
  agent-identity spec (2026-07-21). It is enough to attribute what the agent writes. The agent acts in
  its home space with the creating user's credentials.
- **Target.** A real HALO identity per agent, keypair held on EDGE (identity-service already keeps
  keyrings in a DO for EDGE devices), admitted to spaces as a member through ordinary invitations.
  What an agent may do in a joined space should come from the permission design (grants scoped per
  space and command), not from blanket membership.
- **Discord side.** The bot's Discord identity is the bot user. Each Discord author maps to a `Person`
  through `Person.identities` (`{ label: 'discord', value: <user id> }`), so the same person is
  recognised in Discord and in Composer.

## Profiles, goals and relay

- **Profile** = a `Person` (or `Organization` for a team) plus the memories and goals the agent holds
  about them, summarised into a profile document linked by `ProfileOf`. Details in
  [MEMORY.md](./MEMORY.md).
- **Relay** (not built) is a task: "tell team X about Y" becomes a `Task` assigned to the agent, which
  it completes by posting to the right Chat, recording the delivery on the task.

## Decisions

1. **The gateway runs in an EDGE Durable Object**, one per bot, hosted in **compute-service** (not
   discord-service): compute-service already has every binding the bot needs (process objects,
   DataService, queues, KMS, operation-service) plus edgeAuth. The outbound websocket keeps the DO
   awake; that cost is accepted.
2. **The agent turn runs on EDGE**, spawned by the DO; hosted agents get tools from operation-service's
   plugin registry.
3. **One Chat per Discord thread**, created on demand by `ensureThreadChat` and idempotent on the
   thread id.
4. **`DiscordBinding` in ECHO is the source of truth** for which bot serves which agent in which
   channels; the DO caches it.
5. **Replies are mirrored by the DO for the spike** (option A); a tool the agent calls is the target
   (option B).
6. **`plugin-agent` manages agents**; shared Discord code (dfx client, message mapping) is
   extracted into a library when option B lands. Until then the DO calls Discord REST with `fetch`.

## Open decision: a shared DXOS Discord app

The spike is bring-your-own-bot: each team creates a Discord application and pastes its token.
Recommendation (2026-10-03): **one DXOS-owned Discord app by default, bring-your-own as an option.**

|                     | Shared DXOS app                                                                                             | Bring your own bot                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Onboarding          | "Add to Discord" OAuth install; no developer portal, no token handling                                      | Developer portal, token pasted into Composer                      |
| Token custody       | DXOS secrets on EDGE                                                                                        | Per team (inline in the space until KMS holds pasted keys)        |
| Identity in Discord | One bot user; per-agent name/avatar via webhooks, per-server nickname                                       | Fully the team's own                                              |
| Discord constraints | App verification past 100 servers; Message Content intent approval; sharding past 2,500 servers             | Mostly none                                                       |
| Isolation and cost  | One gateway carries every customer's messages: routing must be strictly by binding, single point of failure | Separate rate limits and failure domains; one gateway DO per team |

What the shared app changes:

1. The binding is keyed by `{ guildId, channels }` (the install flow supplies the guild); the
   application id is implied.
2. One (eventually sharded) gateway DO for the shared app routes each message by guild and channel;
   bring-your-own bots keep today's DO per application.
3. A webhook per bound channel so each agent posts under its own name and avatar.
4. Discord-side work: verification, Message Content intent approval, and an install page in
   Composer.

## Known gaps

- **Bot tokens live inline in the space.** KMS manages OAuth tokens only; storing a pasted key in KMS
  needs a kms-service route plus plugin-connector support.
- **Publishing.** plugin-agent and plugin-crm are private, so EDGE's operation-service only gets
  them through a local `link-packages`, not the pinned catalog.
- **Live run pending.** The live Discord ↔ model run waits on an Anthropic key and a bot token. The
  scripted interview story and the EDGE workerd integration test (fake Discord) cover each side.

## Existing pieces this builds on

- `Agent`, `Chat`, `AgentService`, `AgentIdentity` — `packages/core/compute/{assistant,compute,agent-runtime}`.
- plugin-discord (REST sync into `Channel` feeds), `@dxos/pipeline-discord`, `@dxos/crawler`.
- EDGE compute-service process DOs and operation-service, identity-service keyrings, kms-service.
- plugin-crm `ProfileOf`; plugin-brain's fact store becomes a derived index over `Memory` (open).
- Prior specs: `agents/superpowers/specs/2026-07-08-discord-bot-design.md`,
  `2026-07-21-agent-identity.md`, `.agents/projects/agent-process-edge/DESIGN.md`.
