# Interlocutor — design

Status: draft 4 (2026-10-03) — goals, home space and workspaces; architecture as built for the first
spike. Memory model:
[MEMORY.md](./MEMORY.md). EDGE half: dxos/edge `compute-service/src/discord/` and that repo's
`.agents/projects/interlocutor/DESIGN.md`.

## Goals

Set by Rich, 2026-10-03.

1. **Memory lives in the home space.** An agent's memory is the space it was created in — its
   **home**, where it has permission to store memories. It may later learn about other spaces, but
   its memories stay home.
2. **Notes on anything.** An agent can attach a note to any object — a document, a sketch, a
   `Person`, a `Project`. A note is a memory object, initially little more than a markdown `Text`,
   related to its subject (see [MEMORY.md](./MEMORY.md)).
3. **Modes, extensible through skills.** An agent works in modes — transcriber (meetings, calls),
   designer, interviewer, fact-checker, researcher. A mode is a skill (instructions plus tools), so
   new modes are new skills.
4. **Tasks at two scales.** An agent helps people track large task sets (thousands of tasks across
   hundreds of projects), and it also keeps **its own** task list for what people have asked it to
   do.
5. **Many conversations at once.** An agent monitors several channels (threads, feeds) at the same
   time, with many people and groups.
6. **A model of everyone and everything.** An agent keeps a memory of everyone it interacts with in
   the space, and a graph of the other concepts it encounters.

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
 Agent → AgentChannels → Channel (Discord backend: DiscordChannel config)
   │ Start ─ thread.connectChannel ─ PUT /compute/discord/bots/:appId ─▶ compute-service
   │   (EdgeHttpClient.request, signed with the user's identity)  ├ edgeAuth + space membership
   │                                                              └▶ DiscordBot DO (one per bot)
   │                                                                  ├ reads the bot config + AccessToken (DataService)
   │                                                                  ├ gateway websocket ◀───────────── MESSAGE_CREATE
   │                                                                  ├ SQLite inbox → alarm drains in order
   │                                                                  ├ ensureChannelChat ─▶ operation-service
   │                                                                  │                      (Chat per conversation, child of Agent)
   │                                                                  ├ spawn AgentProcess + submitInput(AgentInput)
   │                                                                  │     └▶ model + skills → tool calls → ECHO writes
   │                                                                  └ mirror: new assistant Messages ── REST ──▶ thread reply
   │
   └ Chat article / Profile panel ◀── replication ── ECHO space: Agent, Chats, Person, Goal, Memory, profile doc
```

### 1. Setup (Composer)

- `createAgent` makes an `Agent` (instructions, primary chat, the agent-conversation and interview skills).
- The agent's **Activity** companion edits its `AgentChannels` (`{ agent, channels: Ref<Channel>[] }`,
  parented to the agent) with a channel picker, and below it renders each channel's
  `ObjectProperties` surface. For a Discord-backed channel that is plugin-discord's form over the
  `DiscordChannel` config (`{ accessToken, applicationId, guildId?, channels }`; the bot token is an
  `AccessToken` object), the bot status and Start / Stop / Refresh.
- Start / Stop / Refresh invoke plugin-thread's `connectChannel` / `disconnectChannel` /
  `getChannelStatus`, which dispatch to the Discord backend's `connection`: `PUT` / `DELETE` / `GET
/compute/discord/bots/:appId` through `EdgeHttpClient.request`, a generic call signed with the
  identity's verifiable presentation. `PUT` sends `{ spaceId, binding: "echo://<space>/<configId>",
channel: "echo://<space>/<channelId>" }`; the status (`running`, gateway state, thread count, last
  error) is shown under the form and polled every 5 s. The companion lists the agent's channel
  conversations. Starting needs the user's identity, so it works only in the app.

### 2. Inbound (Discord → agent)

> Until edge step 4 lands, the EDGE side below still reads a `DiscordBinding` (with its `agent`) and
> calls `ensureThreadChat`; plugin-agent no longer provides either, so Discord messages do not reach
> the agent in between. Step 4 resolves the agent from the channel and calls `ensureChannelChat`.

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

## Home space and workspaces

An agent may be asked to work in spaces other than its home. Example: Kai lives in Rich's home space
and is invited into "Eng Space" to organise its projects and tasks, while its memories about the
people there stay home. The model:

- **Home space** — holds the `Agent`, its chats, its own task list, and all its memory (people,
  organisations, concepts, goals, notes). Memory is always written home, whichever space the work is
  in.
- **Workspaces** — other spaces the agent is invited into. Work products (tasks, projects, documents)
  are written where the work is; the agent reads them there and uses that space's skills while it
  works on them.
- **Provenance** — every memory records the space (and channel) it was learned in, so recall can
  filter by audience: what was learned in Eng Space is used when working for Eng Space, and DMs stay
  private (see MEMORY.md, Conversations).

**Can we do this? Yes — the runtime already scopes each operation call to a space.**
`Operation.InvokeOptions.spaceId` sets the space whose `Database.Service` the handler (and anything
it spawns) runs against, and the browser and EDGE invokers both honour it. What is missing:

1. **Per-tool space routing.** Today a turn's tool calls inherit the space of the process running
   the conversation. The agent needs its memory tools (`resolveEntity`, `recordMemory`,
   `retrieveMemories`, `suggestGoal`, `updateProfile`, notes) routed to the **home** space, and its
   work tools (tasks, projects, documents) routed to the **workspace** the conversation is about —
   e.g. a skill-level `space: 'home' | 'workspace'` binding resolved by the session when it invokes
   the tool, with the workspace taken from the conversation (a chat bound to Eng Space).
2. **Access to the workspace.** For the spike the agent runs with its creator's credentials, so it
   can already reach any space the creator is a member of. For spaces the creator does not own, the
   agent needs its own HALO identity, invited as a member of Eng Space, with grants scoped by the
   permission design (e.g. tasks and projects only).
3. **Cross-space references.** Memories about Eng Space objects refer to them by space-qualified
   `echo://<space>/<id>` URIs; a `Person` at home links to that person's member identity (DID) in
   every workspace, so the same person is recognised across spaces.
4. **Workspace skills.** "All skills of the spaces I'm in" as a resolved list — today skills bind to
   a chat explicitly (`AiContext.Binder`).

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
3. **One Chat per conversation** (a channel, or a thread or DM inside it), created on demand by
   `ensureChannelChat` and idempotent on the channel and thread id.
4. **ECHO is the source of truth** for which bot serves which agent in which channels — the
   `DiscordChannel` config and the agent's `AgentChannels` — and the DO caches it.
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

## Channel-agnostic agents (steps 1–3 built)

**Goal:** plugin-agent knows nothing about Discord. An agent talks in any conversation a channel
backend provides — Discord, Slack, freeq, Bluesky, the local feed — through plugin-thread's
`ThreadCapabilities.ChannelBackend`, implemented by each backend plugin. plugin-discord owns
everything Discord-specific (token, gateway, binding form, bot status).

### Before

`ChannelBackendProvider` had `kind`, `label`, `createFields`, `makeConfig`, `subscribe` and `send`
(plus optional `readOnly`). plugin-thread (local feed), plugin-freeq and plugin-bluesky implement it;
both of the latter `dependsOn: ['org.dxos.plugin.thread']`. plugin-discord implemented nothing;
plugin-agent talked to Discord itself (`sendDiscordMessage`, the Discord branches of `sendMessage`,
`ensureThreadChat`, `start/stop/getDiscordBotStatus`, `DiscordBinding`).

### Extending `ChannelBackendProvider` (step 1, built)

All additions are **optional**, so freeq, Bluesky and the feed backend keep compiling unchanged
(`plugin-thread/src/types/ThreadCapabilities.ts`):

```ts
interface ChannelBackendProvider {
  // …existing members; `send` may now return a `SendReceipt` (`void` still allowed)…
  send: (channel, message) => Effect<SendReceipt | void, Error, Capability.Service>;

  /** A DM with a person through the channel's account; the thread id, or undefined without a handle. */
  openDirect?: (channel: Channel, person: Person) => Effect<string | undefined, Error, Capability.Service>;

  /** Threads inside the channel (Discord threads and DM channels); thread ids are backend-scoped. */
  threads?: { send: (channel: Channel, thread: string, message: Message) => Effect<SendReceipt | void, …> };

  /** A connection that must be started (a bot gateway, an IRC socket); absent means always available. */
  connection?: { start; stop; status }; // each (channel) => Effect<ConnectionStatus, Error, Capability.Service>
}

type SendReceipt = { messageIds?: string[]; properties?: Record<string, unknown> };
type ConnectionStatus = { running: boolean; state?: string; detail?: string; error?: string };
```

Differences from the first sketch, and why:

- **A thread is `(channel, threadId)`, not a `ThreadRef` object.** The channel is always in hand
  where a thread id is, so a second reference type added nothing.
- **`openDirect` takes the channel.** The DM is sent by the channel's account (a Discord bot token),
  so the person alone does not say which account reaches them; it returns a thread id on that channel.
- **No `threads.open` yet.** EDGE opens Discord threads itself; nothing in Composer needs to.
- **`send` returns a receipt.** The caller records what it sent in the agent's chat, and EDGE's
  mirror must not post that record a second time, so the backend's ids travel back as `properties`.

Generic operations in plugin-thread dispatch to the provider found by `channel.backend.kind`
(`Capability.getAll(ThreadCapabilities.ChannelBackend)`): `sendToChannel { channel, thread?, text }`,
`openDirect { channel, person }`, `connectChannel` / `disconnectChannel` / `getChannelStatus
{ channel }`. A missing provider fails with `ChannelBackendNotFoundError`, a missing optional member
with `ChannelBackendUnsupportedError`; a backend refusal (closed DMs, no permission) is an outcome —
`{ delivered: false, reason }` — that the agent relays.

### Discord backend (step 2, built)

plugin-discord contributes `makeDiscordChannelBackend()` (`kind: org.dxos.channel.backend.discord`)
in every runtime, so EDGE posts through the same provider the app starts the bot with:

- **Config.** `DiscordChannel` (`org.dxos.type.discord.channel`) holds what `DiscordBinding` held
  minus the agent: `accessToken`, `applicationId`, `guildId?`, `channels`. It is the create-channel
  form for the Discord backend (`createFields`).
- **Posting.** `send` posts into the first listed Discord channel, `threads.send` into a thread or DM
  channel id, both over Discord REST with the pasted token (split past 2000 characters, mentions
  never echoed). The receipt's `properties.discord.messageId` keeps EDGE's mirror from re-posting.
- **DMs.** `openDirect` reads the person's `discord` identity and opens the bot's DM channel.
- **Connection.** `start/stop/status` call `PUT/DELETE/GET /compute/discord/bots/:applicationId`
  through the app client's EDGE HTTP client. `PUT` sends `{ spaceId, binding: <config URI>,
channel: <channel URI> }`; until step 4 EDGE still expects a binding with an `agent` field, so a bot
  started from a channel cannot resolve its agent there yet.
- **UI.** The Channel's `ObjectProperties` surface (kind = Discord) renders the config form, the bot
  status and Start/Stop/Refresh; plugin-agent shows it for each of the agent's channels.

### Slack backend (built)

plugin-slack contributes `slackChannelBackend` (`kind: org.dxos.channel.backend.slack`) in every
runtime and `dependsOn` plugin-thread:

- **Config.** `SlackChannel` (`org.dxos.type.slack.channel`): `accessToken`, `conversationId`,
  `teamId?`, and the `feed` the connector's sync mirrors the conversation into (owned by the config).
  Materializing a Slack target creates channels on this backend with the connection's token.
- **Token.** EDGE requests the connector's scopes as Slack's bot `scope`, so the connection's token
  is the bot token (`xoxb-…`) and posts come from the bot. The scopes add `chat:write` and
  `im:write`; connections made before must reconnect to grant them, and until then `readOnly` (no
  `chat:write` in the token's recorded scopes) keeps their channels read-only.
- **Posting.** `send` and `threads.send` call `chat.postMessage`; a thread id that is a Slack `ts`
  replies in the channel's conversation (`thread_ts`), any other is a conversation id (a DM). A post
  into the channel's own conversation is appended to the mirror feed at once, keyed by its `ts`, and
  the sync skips messages whose `ts` the feed already holds. The receipt carries
  `properties.slack: { channel, ts, threadTs }`. Slack refusals (`missing_scope`, `not_in_channel`)
  become reasons, so `sendToChannel` answers `{ delivered: false, reason }`.
- **DMs.** `openDirect` reads the person's `slack` identity (a Slack user id) and returns the DM
  conversation id from `conversations.open`.
- **Migration.** Slack channels created before the backend (feed-backed, keyed by the
  conversation) are moved onto it on the next sync or materialize, adopting their feed as the
  mirror; the upgrade is idempotent.
- **No connection.** Receiving is the connector's polling sync; real-time receiving (Events API or
  Socket Mode on EDGE, driving agent turns) is deferred.

### plugin-agent on channels (step 3, built)

plugin-agent no longer names a backend:

- **`AgentChannels`** (`org.dxos.type.agent.channels@0.1.0`, parented to the agent) lists the
  `Channel`s the agent converses in; a new object rather than a field on `Agent`, which
  `@dxos/assistant` owns and which is not channel-aware.
- **`ensureChannelChat { agent, channel, thread?, title? }`** replaces `ensureThreadChat`. The chat's
  foreign key is `{ source: 'org.dxos.agent/channel', id: '<channelId>[/<thread>]' }`, so a channel and
  each thread or DM in it are separate conversations, and thread ids from different backends never
  collide.
- **`Relay`** is `0.2.0`: `replyChannel: Ref<Channel>` and `replyThread?: string` replace
  `replyChannelId`. Relays at `0.1.0` are not migrated (labs plugin; they stop listing).
- **`sendMessage`** delivers in order: a report to a relay's requester goes to its reply channel and
  thread; else the person's chat (posted through its channel when the chat mirrors one); else the first
  of the agent's channels whose backend opens a direct conversation. Every post goes through
  `sendToChannel` and is recorded in that conversation's chat with the receipt's `properties`.
  Delivery `'discord'` became `'channel'`. A backend without `openDirect` just cannot reach the person
  through that channel; its typed error becomes part of the reason.
- **Deleted:** `DiscordBinding`, `DiscordOperation` (`startDiscordBot`, `stopDiscordBot`,
  `getDiscordBotStatus`, `sendDiscordMessage`), `ensureThreadChat`, `discord-rest.ts`, the Discord
  components and their tests; the REST and gateway tests moved to plugin-discord.
- **Instructions** describe a `[<backend> #channel; addressed: …]` header; EDGE still writes
  `[discord …]`, which matches. RelaySkill asks for `replyChannel`/`replyThread`; ConversationSkill
  lists `ensureChannelChat`.
- plugin-agent `dependsOn` plugin-thread, whose operations carry its messages.

### What moved where

| Before (plugin-agent)                                                    | After                                                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DiscordBinding` (agent, token, app id, channel ids)                     | plugin-discord's backend config (`makeConfig`) on a `Channel`; plugin-agent keeps a generic `AgentChannels { agent, channels: Ref<Channel>[] }`  |
| `sendDiscordMessage`                                                     | `channel.sendToChannel { channel, thread?, text }` in plugin-thread, dispatching to the backend's `send` / `threads.send`                        |
| `sendMessage` Discord branches; `Relay.replyChannelId: string`           | send to a `Channel`; `Relay.replyChannel: Ref<Channel>` (+ optional thread id); delivery `'discord'` → `'channel'`                               |
| Discord DM via `discordUserId`                                           | the backend's `openDirect(person)`, then `send`                                                                                                  |
| `ensureThreadChat` (`source: discord.com`)                               | `ensureChannelChat { agent, channel, thread? }` — one chat per channel thread, keyed by the `Channel` (+ thread id) foreign key, backend-neutral |
| `start/stop/getDiscordBotStatus`                                         | `channel.connect/disconnect/status` dispatching to `connection`                                                                                  |
| `DiscordBindingForm`, `DiscordBotStatus`                                 | plugin-discord, rendered on the Agent through a generic "connections" surface                                                                    |
| `[discord #channel; addressed: …]` header (`instructions.ts` + EDGE bot) | `[<backend label> #channel; addressed: …]`                                                                                                       |

### What stays per backend

Receiving on the server. `subscribe` is an in-page callback and cannot drive agent turns on EDGE;
the Discord gateway Durable Object (compute-service) stays Discord's, but it resolves Discord ids to
`Channel` refs and calls `ensureChannelChat` instead of `ensureThreadChat`. A future backend that
needs server-side receiving brings its own EDGE worker the same way.

### Order of work

1. Add the optional members to `ChannelBackendProvider` (plugin-thread) and the generic operations
   (`sendToChannel`, `openDirect`, `connect/disconnect/status`); tests against the feed backend.
2. plugin-discord implements a Discord `ChannelBackend` (`send`, `threads`, `openDirect`,
   `connection` over the EDGE bot routes), and takes over the binding form and status UI.
3. plugin-agent switches to channels: `AgentChannels`, `ensureChannelChat`, `Relay.replyChannel`,
   `sendMessage` via channels; delete the Discord operations and `DiscordBinding`.
4. EDGE bot passes `Channel` refs (edge PR), keeping mention gating and threads.
5. Stories: the playground's Discord panel becomes a feed-backend channel, so the agent is exercised
   through the same capability Discord uses.

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
