# Test plan — mailbox sync, stats, and reply/research

Covers the mailbox sync / stats / reply / research features (PRs #12163 and #12167).
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

All local, uncached, never in CI. Output paths below (`results/`, `results/partial/`) are relative to
the git-ignored `fixtures/local/`.
**Needs** legend:
**oauth** = a Google OAuth client (`.env.tpl` or `GOOGLE_CLIENT_ID`+`SECRET`, one-time — see `scripts/google-auth.mjs`);
**fixture** = `fixtures/local/mailbox-feed.json` present (fetch it, or export from the MailboxSync storybook → Archive → Download);
**models** = Ollama running (`OLLAMA_ORIGINS="*" ollama serve`) for local tiers and/or `DX_ANTHROPIC_API_KEY` for remote.

| Command                                                               | Does                                                                                                                                                                                                                                                                                    | Needs           |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `moon run stories-brain:auth -- --token` (also `--force`, `--revoke`) | Google OAuth helper — print an access token / re-consent / revoke + delete local token                                                                                                                                                                                                  | oauth           |
| `moon run stories-brain:sync`                                         | One consent + in-process Gmail sync → `fixtures/local/mailbox-feed.json` (`FETCH_SYNC_BACK_DAYS=N` sets the horizon)                                                                                                                                                                    | oauth           |
| `moon run stories-brain:bench -- --models … --limit … --tests …`      | Run the bench suite (extract facts + all benches); `--tests <name>` for a subset (e.g. `extract-facts`, `feed-stats`, `list-questions`). Stats → `results/`; seeds `progress.json`; runs `analyze-results`. `--stats` renders the live table inline (vitest logs → `results/bench.log`) | fixture, models |
| `moon run stories-brain:stats` (also `-- --once`)                     | Live table of `progress.json` — per-task bar, rate, and ETA (watch a run started elsewhere); `--once` prints one snapshot                                                                                                                                                               | —               |

Benches `bench --tests <name>` can select (dependency order — `extract-facts` writes the fact store the
fact tests read):

| Bench (`--tests`)    | Does                                                                                  | Model  |
| -------------------- | ------------------------------------------------------------------------------------- | ------ |
| `extract-facts`      | Extract RDF facts — incl. questions/requests as directive facts — → `fact-store.json` | models |
| `extract-contacts`   | Extract actors / senders as contact objects                                           | models |
| `feed-stats`         | Message / thread / sender counts                                                      | —      |
| `subject-facts`      | All facts for `SUBJECT` + their source messages (fact→source bridge)                  | —      |
| `list-questions`     | The directive facts (questions / requests) in the store                               | —      |
| `tags`               | Tag each message (topics + spam)                                                      | models |
| `summarize-messages` | Per-message summary (terse bullets)                                                   | models |
| `summarize-threads`  | Per-thread summary                                                                    | models |
| `extract-questions`  | Classify each act — question / request / notification                                 | models |
| `draft-responses`    | Draft a reply per message (skips non-replyable mail)                                  | models |
| `html-vs-text`       | Fact extraction over native `text/html` vs `text/plain`                               | models |
| `html-to-markdown`   | HTML→markdown conversion throughput                                                   | —      |
| `brain-vs-rag-eval`  | Ablate source / facts / rag / hybrid on a subject prompt; blind judge scores each arm | models |

`brain-vs-rag-eval` is the facts-help test: a fixed judge model grades every arm against one gold
salient-point set (**coverage**) and the source corpus (**faithfulness**), plus a blind pairwise vote
vs. the `database` baseline. Scores + the summaries are written **side-by-side** to
`results/brain-vs-rag-eval.md`; the matrix + pairwise win-rate go to `brain-vs-rag-eval.json`. Facts
help iff a fact arm beats the baseline on coverage without losing faithfulness. `EVAL_SCORE=0` runs
the cheap response-only eval; `JUDGE=<name>` picks the grader (default `claude-sonnet`).

**Env knobs** (`bench` also accepts each as a `--flag`; CLI overrides env overrides `.env`):

| Var                    | Effect                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| `MODELS`               | Model set: `local` \| `remote` \| comma-separated name substrings  |
| `LIMIT`                | Message cap; results go to `results/partial/`                      |
| `CONCURRENCY`          | extract-facts in-flight parallelism (default 10 remote / 1 local)  |
| `TESTS`                | Comma-separated bench names (subset of the suite)                  |
| `SUBJECT`              | Subject for subject-facts / brain-vs-rag                           |
| `SKILL_MODES`          | brain-vs-rag arms to run (subset of source,facts,rag,hybrid)       |
| `JUDGE`                | brain-vs-rag grading model (name substring; default claude-sonnet) |
| `EVAL_SCORE`           | `0` skips brain-vs-rag judge scoring (response-only)               |
| `SAMPLES`              | Max per-variant result rows written to JSON                        |
| `DRAFT_INSTRUCTIONS`   | User instructions steering the draft bench                         |
| `FETCH_SYNC_BACK_DAYS` | Sync-back horizon (days) for `sync`                                |

Results write to `fixtures/local/results/` (git-ignored): `<name>.json` (stats) + `<name>.md` (responses).
