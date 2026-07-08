# Discord Bot Design

Date: 2026-07-08
Status: Draft (for review)
Builds on: [`2026-07-07-discord-crawler-pipeline-design.md`](./2026-07-07-discord-crawler-pipeline-design.md) (phases 2 + 3, implemented) and the bot-identity note in `project_plugin_discord` (keys in config now, ECHO identity later).

## Summary

A long-running bot process ("composer", the existing bot application) that joins configured guild
channels and acts on live gateway events: it **greets new members**, **answers basic questions from
the fact store**, **opens a thread for any question it cannot answer**, and **posts topic summaries
to Composer**. It is not a new stack — it is the crawl pipeline given a push-based source and a
reply path:

- **Ears**: dfx `DiscordGateway` (websocket dispatch as Effect `Stream`s) replaces polling for hot
  channels; the existing REST crawl remains the backfill/catch-up path.
- **Brain**: the phase 2/3 stages unchanged — `persistMessageStage`, `agentProfileStage`,
  `extractQuestionsStage`, `extractFactsStage`, `topicsStage`, `answerOpenQuestions` — over the
  same shared SQLite stores (`MessageStore`, `FactStore`, `QuestionStore`, `ExtractedQuestionStore`,
  `AgentRegistry`).
- **Mouth**: dfx `DiscordREST` (`createMessage`, `startThreadFromMessage`) plus an ECHO client
  session for Composer output (Topic objects + digest messages).

## Goals

1. Greet new members in a configured welcome channel.
2. Answer questions addressed to the bot (or asked in designated channels) from the fact store,
   with citations.
3. When no confident answer exists, start a thread on the question and track it as a standing
   question; answer later when the fact store catches up.
4. Post per-topic summaries (name, summary, participants, range) into a Composer space.

## Non-goals (this design)

- Slash commands / interactions endpoint (HTTP-mode bots) — gateway-first; interactions can come later.
- Moderation, reactions, voice, or rich embeds beyond simple message content.
- Multi-guild fleet management — one guild, one config, one process.
- Autonomous actions beyond the above (the phase 2 `Automation` seam stays specced-only).

## Architecture

New package `@dxos/bot-discord` (`packages/core/compute/bot-discord`, private), runnable as a node
daemon (`moon run bot-discord:serve`); EDGE/container deployment is a later phase (the gateway
needs a persistent websocket, which rules out browser and stock Workers).

```
                    ┌──────────────────────── BotRuntime (node, Effect) ───────────────────────┐
Discord Gateway →→ │ GUILD_MEMBER_ADD ──→ greetBehavior ─────────────────────→ REST reply     │
 (dfx, websocket)   │ MESSAGE_CREATE ───→ gatewaySource ─→ [phase-2/3 stages] ─→ SQLite stores │
                    │                       │                    │                              │
                    │                       └→ answerBehavior ───┼─────────────→ REST reply /  │
                    │                                            │               new thread    │
                    │ THREAD_CREATE ────→ frontier push          └→ topicsStage ─→ ECHO (Topics │
                    │ (cron) catch-up ──→ Crawler.stream (REST backfill)          + digest)    │
                    └───────────────────────────────────────────────────────────────────────────┘
```

- **`gatewaySource`**: adapts `gateway.fromDispatch('MESSAGE_CREATE')` into the crawler's
  `Type.Event` stream (reusing `mapDiscordMessage` from plugin-discord's source), so live messages
  flow through the exact same stage assembly as crawled ones. `persistMessageStage`'s duplicate-drop
  makes gateway + backfill overlap harmless (exactly-once downstream).
- **Catch-up**: on boot and on a timer, `DiscordPipeline.run` over the same stores fills any gap
  from downtime (the durable cursors already handle this). The gateway is an optimization, not the
  source of truth. `THREAD_CREATE` dispatches push the new thread onto the crawl frontier
  (`StateStore.pushTargets` — idempotent), so threads born while the bot listens are crawled
  without waiting for the parent channel to be re-fetched.
- **Config** (extends the existing token-in-config plan): bot token, guild id, channel allowlist,
  welcome channel id, answer channels (always-answer, e.g. `#questions`), summary cadence, answer
  confidence threshold, Composer space target (below).

## Behaviors

### 1. Greet new members

- Subscribe to `GUILD_MEMBER_ADD` (requires the privileged **GUILD_MEMBERS intent** — must be
  enabled for the composer application in the Discord developer portal).
- Post a templated greeting in the welcome channel (`Welcome @name! …` + orientation links);
  template lives in config, supports `{name}` substitution. Never `@everyone`/`@here`.
- Idempotence + restart safety: `greeted_member` table (`user_id` PK, `greeted_at`) in the shared
  SQLite DB; a member is greeted at most once ever. Burst guard: max N greetings/minute, overflow
  greeted in one batched message.

### 2. Answer questions from the fact store

- Trigger on `MESSAGE_CREATE` when the message (a) @mentions the bot, or (b) is in an
  always-answer channel and `detectQuestions` (existing) finds a question. Ignore bots (including
  self) and message edits.
- Answer path reuses the phase-2 machinery: `generateQuery(question)` → `FactStore.query` →
  synthesize with citations. Refactor: extract the synthesis step out of `answerOpenQuestions`
  into a shared `synthesizeAnswer(question, facts)` so the bot and the batch pass share one
  implementation and one prompt.
- Confidence gate: answer only when facts matched AND the model produced an answer (the existing
  "omit the answer field if unsure" contract). Reply in-channel as a Discord reply to the asking
  message, with source citations rendered as message links
  (`https://discord.com/channels/<guild>/<channel>/<message>`) when the fact's `source` is a
  crawled message.
- Idempotence: `answered_message` table (`message_id` PK, disposition `answered | escalated`,
  `answer`, `at`) — a restart never re-answers.

### 3. Escalate unanswerable questions to a thread

When the answer path declines (no facts, or model declined):

1. `startThreadFromMessage(messageId, { name })` — thread name = question truncated to 90 chars.
2. Post a starter in the thread: "Tracking this — I'll answer here when I learn more." (template).
3. Register the question in the existing `QuestionStore` (standing questions) and record the
   linkage in `question_thread` (`question_id` PK, `thread_id`, `message_id`).
4. Close the loop: after each crawl/answer pass, any standing question that transitions to
   `answered` and has a `question_thread` row gets its answer (with citations) posted into that
   thread by the bot, then the row is marked delivered.

This makes the escalation productive: the thread invites humans to answer (which the crawler then
ingests as facts), and the bot returns when it can.

### 4. Post summaries to Composer

- The phase-3 `topicsStage` already produces ECHO `Topic` objects. The bot supplies the missing
  piece: a durable ECHO session to a real Composer space.
- Identity: per the bot-identity plan, the bot holds a DXOS identity (keypair in config for now,
  ECHO-native identity later) via `@dxos/client` in node; it is invited to the target space once
  (halo invitation flow), and the space id lives in config.
- Output, per configured cadence (default: on `ThreadEnd`/`ChannelEnd` + hourly tick):
  1. Upsert `Topic` objects into the space (existing `topicsStage({ db })` — unchanged).
  2. Append a digest `Message` ("📌 <name> — <summary> (<n> messages, participants)") to the
     Channel feed that plugin-discord's feed-sync already maps for that Discord channel (found by
     the existing `findChannelForDiscordChannel` foreign key), so summaries appear inline in
     Composer's channel view. Digest messages carry a foreign key
     `{ source: 'discord.com', id: 'digest:<targetId>#<startMessageId>' }` for upsert-not-duplicate.
- If the space/Channel mapping is absent, Topics are still upserted; the digest step is skipped
  and logged.

## State

All bot state lives in the same shared SQLite database as the crawl (one `SqlClient`):

| Table | Contents |
| --- | --- |
| `greeted_member` | `user_id` PK, `greeted_at` |
| `answered_message` | `message_id` PK, `disposition`, `answer`, `at` |
| `question_thread` | `question_id` PK, `thread_id`, `message_id`, `delivered_at` |

Everything else (messages, cursors, agents, facts, questions, extracted questions) is the existing
phase 2/3 schema — the bot adds no parallel bookkeeping.

## Safety and limits

- Never mention `@everyone`/`@here`; greetings and answers mention only the addressee.
- Ignore all bot-authored messages (loop guard) and respect a global replies-per-minute budget;
  dfx's rate-limit store handles 429s underneath.
- Channel allowlist is authoritative: no reads or writes outside it.
- Kill switch: a config flag (and `SIGTERM`) stops behaviors; catch-up on next boot heals the gap.
- Answers always cite sources; when confidence is low the bot escalates instead of guessing (the
  existing "do not guess" prompt contract).

## Testing

- **Unit**: behaviors take a `BotEnv` (gateway stream + REST facade as Effect services) — a
  `FixtureGateway` (in-memory dispatch stream) and a recording REST fake drive greet/answer/escalate
  deterministically; the answer path reuses the routing-fake AiService pattern from
  `answer-questions.test.ts`.
- **Integration**: escalate→learn→deliver loop over the fixture channel: unanswerable question →
  thread recorded → facts added → standing question answered → delivery posted (recorded REST).
  Composer output via `EchoTestBuilder` (Topics + digest feed messages), as in `topics.test.ts`.
- **Live (gated)**: `DISCORD_TOKEN` + test channel (`#test-bot`, 1494842957340086382) — post a
  question, assert reply-or-thread; `runInCI: false` like the existing demos.

## Phasing

1. **P1 — node daemon**: package scaffold, gateway source, greet + answer + escalate behaviors,
   SQLite state, unit/integration tests, live smoke against `#test-bot`.
2. **P2 — Composer output**: bot ECHO identity + space invitation flow, Topic upsert + channel
   digest, delivery of late answers into threads.
3. **P3 — deployment**: supervised long-running EDGE/VM deployment, metrics (greets, answers,
   escalations, answer rate), config UI in plugin-discord.

## Open questions

1. Greeting venue: welcome channel post (assumed) vs. DM — DMs feel personal but read as spam;
   default is the channel.
2. Answer scope: only when @mentioned outside `#questions`-style channels (assumed), or any
   detected question in allowlisted channels?
3. Composer digest target: the feed-synced Channel (assumed) vs. a dedicated "Digest" collection
   per space.
4. Does the bot run embedded in the EDGE agent runtime eventually (sharing its ECHO identity), or
   stay a standalone daemon with its own identity? P1/P2 assume standalone.
