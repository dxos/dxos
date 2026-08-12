# Pipeline test audit

Living index of the unit tests and storybook tests that cover the mailbox/feed pipelines exercised
by this package. Update alongside any pipeline change.

Run a unit file: `pnpm --filter <pkg> exec vitest run --project=node <file>`.
Run storybook play tests: `moon run stories-inbox:test` (or open the story on the dev server).

## Storybook tests (`src/stories/`)

| Story                          | Play test                                                  | Covers                                                                                        |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `FeedPipeline` → `FixtureTest` | cursor cycle: Process → counts advance → Reset → reprocess | `InboxOperation.ProcessMailbox` / `ResetProcessCursor`, cursored feed paging, progress meters |
| `FeedPipeline` → `CrmTest`     | CRM button seeds contacts                                  | contact extraction over the demo seed (Organizations gate)                                    |
| `FeedPipeline` → `TripTest`    | Auto-extract collapses two trip legs into one Trip         | auto-dispatch extraction (canned AI payloads)                                                 |
| `MessageExtractor` → `Test`    | single-message extraction                                  | `InboxOperation.ExtractMessage`                                                               |
| `MailboxSync` → `Default`      | sync progress                                              | mailbox sync progress meter                                                                   |
| `MailboxHost` → `Default`      | (no play) manual host harness                              | mailbox UI shell                                                                              |

## Unit tests — plugin-inbox operations (`packages/plugins/plugin-inbox`)

| File                                                           | Covers                                                                                                                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/operations/process/process-mailbox.test.ts`               | cursored ProcessMailbox: tag+advance, incremental resume, reset cycle, foreign-cursor isolation, malformed dates                                                           |
| `src/operations/correspondents/extract-correspondents.test.ts` | ExtractCorrespondents: address-list parsing, correspondent derivation (outbound + direct replies, automated deny), idempotent Person creation, Organization link by domain |
| `src/operations/analyze/analyze-mailbox.test.ts`               | fact-pipeline operation; cursor isolation from tagged consumers                                                                                                            |
| `src/operations/extractor/extract-mailbox.test.ts`             | mailbox-wide extraction                                                                                                                                                    |
| `src/operations/extractor/extract-message.test.ts`             | single-message extraction                                                                                                                                                  |
| `src/operations/extractor/ai-gate.test.ts`                     | extraction AI gating                                                                                                                                                       |
| `src/operations/extractor/summarize-extractor.test.ts`         | summarize extractor                                                                                                                                                        |
| `src/operations/sync.test.ts`                                  | mailbox sync operation                                                                                                                                                     |
| `src/types/Mailbox.test.ts`                                    | mailbox helpers (filters, subscriptions, unsubscribe parsing, tagging)                                                                                                     |
| `src/types/ExtractedFrom.test.ts`                              | extraction provenance                                                                                                                                                      |
| `src/types/SystemTags.test.ts`                                 | system tags                                                                                                                                                                |

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
