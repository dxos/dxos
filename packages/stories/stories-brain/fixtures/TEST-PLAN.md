# Test plan — mailbox sync, stats, and reply/research

Covers the features on the `claude/mailboxsync-feed-export-4feb3d` branch (PR #12163).
Deterministic unit tests run in CI; the model-driven benches and the storybook are local-only
(the private mailbox fixture is git-ignored under `fixtures/local/`).

## 1. Features

- **Transient stats capability** (`@dxos/app-toolkit` `AppCapabilities.StatsPanel`; impl + surface in
  `plugin-debug`). One compartment per plugin (indexed by plugin key), full read / scoped write,
  optional `localStorage` persistence (on by default). Rendered as a key × value table.
- **Gmail sync — body synthesis** (`plugin-inbox` `mapper.ts`). HTML-only messages get a synthesized
  `text/markdown` block; whitespace-only parts are treated as absent.
- **Gmail sync — reply-worthiness signals**. No-reply sender + `List-Unsubscribe` header recorded on
  `Message.properties` (`noReply`, `listUnsubscribe`); `Mailbox.isReplyable` gates draft creation.
- **Gmail sync — stats stage** (`sync.ts`). Per-message telemetry (counts, body-part coverage, sync
  range, timing) written to the plugin's `StatsPanel` compartment.
- **Speech-act axis** (`pipeline-rdf` `Illocution`). Optional `illocution` on `Fact`
  (assertive/directive/commissive/expressive + mood); `extract-questions` classifies
  questions/requests/notifications.
- **Fact→source bridge** (`plugin-brain` `SummarizeSubject`). Returns `sources` — the source message
  DXNs the summarized facts came from.
- **Per-mailbox reply Instructions**. Optional `Mailbox.instructions: Ref(@dxos/compute Instructions)`;
  the draft bench threads an instructions string into the prompt.
- **Research harness** (`stories-brain`). Multi-model benches — tags, summaries, contacts, facts,
  questions (illocution), draft-responses (skips non-replyable), html-vs-text, html-to-markdown — plus
  the brain-vs-rag skill eval. `ModuleContainer` registers attendables + shares `withModuleProps`.

## 2. Manual testing (via storybook)

The `MailboxSync` story (`@dxos/stories-inbox`) drives the product end-to-end.

1. Serve this worktree's storybook (port 9009; kill any stale instance first):
   `moon run stories-inbox:storybook`
2. Open `stories/stories-inbox/MailboxSync` → **Default**.
3. **Modules render** — Mailbox, Message, Connector, Archive, and **Stats** columns. Each cell is an
   attendable (`data-attendable-id`, role-based id); focusing a module makes it the current attention.
4. **Archive module** — Download feed (JSON), Upload feed (from file), Reset (empty feed + drop the
   SyncBinding).
5. **Stats panel** — shows "No stats yet." until a sync runs; persists across reloads (localStorage).
6. **Sync (OAuth)** — Connect via the Connector, then sync. Observe the Stats table populate live:
   `processed` / `newMessages`, `threads`, `senders`, `coverage.{plain,synthesizedMarkdown,htmlOnly,none}`,
   `range.*`, and `durationMs`. Bulk/no-reply mail is flagged (`properties.noReply` / `listUnsubscribe`).

Check the browser console for errors after each step.

## 3. Running tests

**moon tasks (the loop).** Local, uncached, never in CI:

```bash
moon run stories-brain:auth -- --revoke   # Google OAuth: --token prints a token, --force re-consents, --revoke cancels
moon run stories-brain:fetch-fixture      # OAuth + in-process sync → fixtures/local/mailbox-feed.json
moon run stories-brain:stats              # LLM-free feed stats over the fixture (skips if absent)
MODELS=qwen LIMIT=10 moon run stories-brain:facts   # extract facts → fixtures/local/fact-store.json (LLM; needs models)
```

**Deterministic unit tests** (fast, no model, safe in CI). Run a single file with vitest directly —
do NOT use `moon <pkg>:test -- <file>`, which ignores the filter and runs the whole suite:

```bash
pnpm --filter @dxos/plugin-inbox exec vitest run --project=node src/operations/google/gmail/mapper.test.ts
pnpm --filter @dxos/plugin-inbox exec vitest run --project=node src/operations/google/gmail/sync.test.ts
pnpm --filter @dxos/pipeline-rdf exec vitest run --project=node src/types/Fact.test.ts
pnpm --filter @dxos/plugin-brain exec vitest run --project=node src/operations/operations.test.ts
```

**Fetching the private fixture** (`fixtures/local/mailbox-feed.json`). Either export it from the
MailboxSync storybook (Archive → Download), or fetch it headlessly with the reusable tool:

```bash
# one-time: create a Google Cloud OAuth "Desktop app" client (Gmail API + gmail.readonly scope);
# put its id/secret in a git-ignored .env.tpl as op:// refs (see scripts/google-auth.mjs header).
moon run stories-brain:fetch-fixture     # or: node scripts/fetch-fixture.mjs
```

First run resolves the creds via `op inject`, opens the browser for one consent, saves a refresh
token, syncs, and writes the fixture; later runs are non-interactive.

`google-auth.mjs` runs a local-loopback OAuth flow (one browser consent, then a saved refresh token
in `fixtures/local/.google-token.json` mints access tokens automatically); `fetch-fixture.mjs` runs
the Gmail sync in-process (`inboxSyncLiveServices`) and exports the feed. `FETCH_AFTER=yyyy-MM-dd`
overrides the sync-back start.

**Model-driven benches** (local only; need the fixture + models). Prerequisites:

- `fixtures/local/mailbox-feed.json` present (see above).
- Local tier: Ollama running (`OLLAMA_ORIGINS="*" ollama serve`) with the models pulled.
- Remote tier: `export DX_ANTHROPIC_API_KEY=<key>` (never commit it).

```bash
# one bench, narrowed + capped (writes to fixtures/local/results/partial/)
MODELS=local LIMIT=5 pnpm --filter @dxos/stories-brain exec vitest run --project=node \
  src/test/draft-responses.bench.test.ts

# instruction-steered drafts
DRAFT_INSTRUCTIONS="Sign off as 'Rich'. One sentence." MODELS=qwen LIMIT=5 \
  pnpm --filter @dxos/stories-brain exec vitest run --project=node src/test/draft-responses.bench.test.ts

# full suite via the orchestrator (seeds progress.json, runs the analyzer)
node scripts/run-suite.mjs                          # all benches, all models
TESTS=draft-responses,extract-questions LIMIT=10 node scripts/run-suite.mjs   # subset
```

- Results land in `fixtures/local/results/` (git-ignored) as `<name>.json` (stats) + `<name>.md` (responses).
- Env knobs:
  - `MODELS` (`local` | `remote` | name substrings)
  - `LIMIT` (message cap → `partial/`)
  - `TESTS` (comma-separated bench names)
  - `SUBJECT`
  - `SAMPLES`
  - `DRAFT_INSTRUCTIONS`
