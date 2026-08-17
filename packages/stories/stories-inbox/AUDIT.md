# Pipeline test audit

Living index of the unit tests and storybook tests that cover the mailbox/feed pipelines exercised
by this package. Update alongside any pipeline change.

Run a unit file: `pnpm --filter <pkg> exec vitest run --project=node <file>`.
Run storybook play tests: `moon run stories-inbox:test` (or open the story on the dev server).

## Storybook tests (`src/stories/`)

| Story                            | Play test                                                  | Covers                                                                                        |
| -------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `MailboxAnalyze` → `FixtureTest` | cursor cycle: Process → counts advance → Reset → reprocess | `InboxOperation.ProcessMailbox` / `ResetProcessCursor`, cursored feed paging, progress meters |
| `MailboxAnalyze` → `CrmTest`     | CRM button seeds contacts                                  | contact extraction over the demo seed (Organizations gate)                                    |
| `MailboxAnalyze` → `TripTest`    | Auto-extract collapses two trip legs into one Trip         | auto-dispatch extraction (canned AI payloads)                                                 |
| `MessageExtractor` → `Test`      | single-message extraction                                  | `InboxOperation.ExtractMessage`                                                               |
| `MailboxSync` → `Default`        | sync progress                                              | mailbox sync progress meter                                                                   |
| `MailboxHost` → `Default`        | (no play) manual host harness                              | mailbox UI shell                                                                              |

## Unit tests — plugin-inbox operations (`packages/plugins/plugin-inbox`)

| File                                                           | Covers                                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/operations/process/process-mailbox.test.ts`               | cursored ProcessMailbox: tag+advance, incremental resume, reset cycle, foreign-cursor isolation, malformed dates                                                                                                        |
| `src/operations/correspondents/extract-correspondents.test.ts` | ExtractCorrespondents: address-list parsing, correspondent derivation (outbound + direct replies, automated deny), idempotent Person + derived-Organization creation, Organization link by domain                       |
| `extractor-lib`: `src/contact.test.ts`                         | `buildContactGraph`: Organization creation for corporate domains, free-mail deny, existing-org link, in-run domain dedup, gate-before-org ordering                                                                      |
| `src/operations/subscriptions/extract-subscriptions.test.ts`   | ExtractSubscriptions: header + body affordances aggregated onto `mailbox.subscriptions`, wholesale-replace idempotency                                                                                                  |
| `src/operations/enrich/enrich-mailbox.test.ts`                 | EnrichMailbox cascade: tier ordering (contacts before classify), skip without identity addresses, stop-on-error with untried stages reported, idempotency across reruns                                                 |
| `src/operations/summarize/summarize-mailbox.test.ts`           | SummarizeMailbox (model-fixture, LLM): contact gate, annotation feed writes, skip-already-summarized idempotency, batchLimit bound                                                                                      |
| `src/types/Mailbox.test.ts` (annotations)                      | annotation feed: merge by `parentMessage`, newest summary supersedes, annotations never leak into the message feed, identity-address resolution                                                                         |
| `src/operations/classify/classify-mailbox.test.ts`             | ClassifyMailbox (model-fixture, LLM): known-person shortcut, spam verdict, category tags, batchLimit + cursor resume/reset. Replay: `DX_RUN_MODEL_FIXTURE_TESTS=1`; regenerate per the `regenerate-model-fixture` skill |
| `src/operations/analyze/analyze-mailbox.test.ts`               | fact-pipeline operation; cursor isolation from tagged consumers                                                                                                                                                         |
| `src/operations/extractor/extract-mailbox.test.ts`             | mailbox-wide extraction                                                                                                                                                                                                 |
| `src/operations/extractor/extract-message.test.ts`             | single-message extraction                                                                                                                                                                                               |
| `src/operations/extractor/ai-gate.test.ts`                     | extraction AI gating                                                                                                                                                                                                    |
| `src/operations/extractor/summarize-extractor.test.ts`         | summarize extractor                                                                                                                                                                                                     |
| `src/operations/sync.test.ts`                                  | mailbox sync operation                                                                                                                                                                                                  |
| `src/types/Mailbox.test.ts`                                    | mailbox helpers (filters, subscriptions, unsubscribe parsing, tagging)                                                                                                                                                  |
| `src/types/ExtractedFrom.test.ts`                              | extraction provenance                                                                                                                                                                                                   |
| `src/types/SystemTags.test.ts`                                 | system tags                                                                                                                                                                                                             |

## Unit tests — plugin-crm (`packages/plugins/plugin-crm`)

| File                                     | Covers                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/operations/enrich-images.test.ts`   | EnrichImages: Gravatar SHA-256 candidates, org logo/favicon candidates, skip paths (no email/domain), image-holders excluded |
| `src/operations/process-mailbox.test.ts` | cursored CRM contact + profile pipeline                                                                                      |
| `src/operations/research.test.ts`        | person/organization research                                                                                                 |

## Unit tests — plugin-projects (`packages/plugins/plugin-projects`)

| File                                              | Covers                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/operations/mailbox/mailbox-projects.test.ts` | mailbox→project pipelines: UpdateProjectTasks (idempotent request tracking, user edits preserved), UpdateTravelLog (regenerated bookings document), UpdateInvestorLog (contact graph + per-thread sections), CreateTrackingProject (scaffold + runnable feed routine + backfill) |

## Fixture harness (`src/test/`, this package)

| File                                | Covers                                                                                                                                                                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/test/mailbox-fixture.test.ts`  | real-corpus ingestion smoke test (skips when no fixture pulled)                                                                                                                                                                                                                                       |
| `src/test/classify-fixture.test.ts` | LIVE full-corpus classification (opt-in: `DX_ANTHROPIC_API_KEY` + `DX_RUN_CLASSIFY_FIXTURE=1`); correspondent allowlist then ≤100-message batches. Last run 2026-08-12: 391 processed / 4 batches — Updates 219, Promotions 58, Personal 52, Forums 34, Social 15, Spam 13; 23 known-person shortcuts |

## Unit tests — pipeline packages (`packages/core/compute`)

| File                                                               | Covers                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `pipeline/src/Pipeline.test.ts`                                    | pipeline runtime (stages, abort)                                  |
| `pipeline/src/Stage.test.ts`                                       | stage combinators                                                 |
| `pipeline-email/src/fact-pipeline.test.ts`                         | fact pipeline: cursor keying, ascending order, NaN-date filtering |
| `pipeline-email/src/pipeline.test.ts`                              | email pipeline assembly                                           |
| `pipeline-email/src/stages/extract-facts.test.ts`                  | LLM fact extraction stage                                         |
| `pipeline-email/src/stages/extract-facts-commit.test.ts`           | fact commit stage                                                 |
| `pipeline-email/src/stages/facts.test.ts`                          | fact model                                                        |
| `pipeline-email/src/stages/tag.test.ts`                            | tagging stage                                                     |
| `pipeline-email/src/stages/stats.test.ts`                          | stats stage                                                       |
| `pipeline-email/src/internal/threading.test.ts`, `threads.test.ts` | thread reconstruction                                             |
| `pipeline-email/src/topics-pipeline.test.ts`                       | topic rollups                                                     |
