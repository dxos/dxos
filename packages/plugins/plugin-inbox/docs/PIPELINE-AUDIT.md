# Pipeline & operation audit

_Every pipeline and every research / extract / analyze operation over a mailbox feed, with the tests
and storybooks that exercise each. Written 2026-08-15._

> **Not** [`AUDIT.md`](AUDIT.md), which is a decomposition audit (splitting plugin-inbox into domain
> and provider plugins) and unrelated to this. Design lives in [`PIPELINE.md`](PIPELINE.md); the
> manual walkthrough in [`TESTING.md`](TESTING.md).

The point of this document is the **gap column**. Counting tests per package says nothing useful:
plugin-inbox has 33 test files, and no test drives a message through the pipeline end to end.

## 1. Sync — writes the feed

Provider-agnostic harness in `plugin-inbox/src/sync/mail-sync.ts`; each provider contributes an
Effect service. Exactly one is active per binding.

| Pipeline              | Where                                    | Integration tests                                                                                        | Storybook             | Gap                                                                                               |
| --------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Gmail mail sync       | `plugin-google/operations/mail/sync`     | `sync.test.ts` (22), `mapper.test.ts`, `sync-e2e.test.ts`, `fetch-fixture.test.ts`, `sync-bench.test.ts` | `MailboxSync.stories` | — strongest coverage in the tree                                                                  |
| Gmail calendar sync   | `plugin-google/operations/calendar/sync` | `sync.test.ts`, `sync-mock.test.ts`                                                                      | none                  | no story exercises calendar sync                                                                  |
| Gmail send            | `plugin-google/operations/mail/send`     | `handler.test.ts`                                                                                        | none                  | —                                                                                                 |
| JMAP mail sync        | `plugin-jmap/operations/mail/sync`       | `sync.test.ts`, `mapper.test.ts`, `sync-e2e.test.ts`                                                     | none                  | **no story**; JMAP is only ever seen through tests                                                |
| JMAP send             | `plugin-jmap/operations/mail/send`       | none                                                                                                     | none                  | **untested**                                                                                      |
| On-arrival extractors | `plugin-inbox/src/util/on-arrival.ts`    | none                                                                                                     | none                  | **commented out of the sync chain** (`mail-sync.ts:474`) — cannot run off-host under edge compute |

## 2. Analyze — reads the feed through cursors

Six contributed `MailboxProcessor` passes, DAG-ordered by declared `after` edges. Host:
`plugin-inbox/operations/analyze/analyze-mailbox.ts`.

| Pass            | Tier          | Cursored                            | Operation                       | Tests                                                               | Storybook                      | Gap                                                                                                                                                                                                                |
| --------------- | ------------- | ----------------------------------- | ------------------------------- | ------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `contacts`      | deterministic | no                                  | `ExtractCorrespondents`         | `extract-correspondents.test.ts`                                    | none                           | re-derives the whole feed each run; cursor is a clear win and unclaimed                                                                                                                                            |
| `subscriptions` | deterministic | **deliberately not**                | `ExtractSubscriptions`          | `extract-subscriptions.test.ts`                                     | `SubscriptionsArticle.stories` | replaces derived state wholesale — a cursor would corrupt the aggregate                                                                                                                                            |
| `classify`      | classify      | **yes**                             | `ClassifyMailbox`               | `classify-mailbox.test.ts` (memoized LLM)                           | none                           | no story drives classification                                                                                                                                                                                     |
| `summarize`     | summarize     | partial (skips by newest thread id) | `SummarizeMailbox`              | `summarize-mailbox.test.ts` (memoized), `summarize-threads.test.ts` | none                           | adding feed position risks double-skip — see PIPELINE.md                                                                                                                                                           |
| `analyze`       | analyze       | **yes**                             | `BrainOperation.AnalyzeMailbox` | `analyze-mailbox.test.ts` (memoized)                                | `FactsCompanion.stories`       | contributed by plugin-brain; absent entirely if brain is not installed                                                                                                                                             |
| `crm`           | classify      | yes (via `ProcessMailbox`)          | `CrmOperation.ProcessMailbox`   | `process-mailbox.test.ts`                                           | `MailboxAnalyze.stories`       | contributed by plugin-crm — **missed by this audit's first pass**, which enumerated processors by grepping the packages that define the seam rather than the whole tree; a contribution point has no such boundary |

Cascade mechanics have their own tests: `topology.test.ts` (ordering, cycles, unknown ids),
`precondition.test.ts` (missing service = skip, not failure), `analyze-mailbox.test.ts` (descendant
blocking, tier filters), `cursor.test.ts` (tag + subject isolation).

## 3. Research / enrich — CRM

| Operation                                 | Where                                    | Tests                               | Storybook              | Gap                                                                                                 |
| ----------------------------------------- | ---------------------------------------- | ----------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------- |
| `ResearchPerson` / `ResearchOrganization` | `plugin-crm/operations/research*.ts`     | `research.test.ts`                  | none                   | creates a skeleton, then hands off to an agent — **the agent half has never been observed running** |
| `EnrichImages`                            | `plugin-crm/operations/enrich-images.ts` | `enrich-images.test.ts`             | `EnrichImages.stories` | no longer invoked by the Research action                                                            |
| `AttachImage` / `image-candidates`        | `plugin-crm/operations/`                 | covered via `enrich-images.test.ts` | —                      | —                                                                                                   |
| CRM skill                                 | `plugin-crm/skills/crm`                  | `skill.test.ts` (memoized)          | none                   | binds skills by querying `Skill.Skill` objects — silently no-ops if none match                      |

## 4. Extractors — per-message

| Operation                              | Tests                         | Storybook                  | Gap                                                                      |
| -------------------------------------- | ----------------------------- | -------------------------- | ------------------------------------------------------------------------ |
| `ExtractMessage`                       | `extract-message.test.ts`     | `MessageExtractor.stories` | —                                                                        |
| `ExtractMailbox`                       | `extract-mailbox.test.ts`     | none                       | `@deprecated`, but still the only live path — its successor does not run |
| `ExtractContact` / `contact-extractor` | via `extract-message.test.ts` | —                          | —                                                                        |
| `SummarizeExtractor`                   | `summarize-extractor.test.ts` | —                          | —                                                                        |
| `ai-gate`                              | `ai-gate.test.ts`             | —                          | —                                                                        |

## 5. Project pipelines — per-Project over a shared mailbox feed

| Operation               | Cursored                          | Tests                      | Storybook                    | Gap                                                               |
| ----------------------- | --------------------------------- | -------------------------- | ---------------------------- | ----------------------------------------------------------------- |
| `UpdateProjectTasks`    | **yes**, per-Project (2026-08-15) | `mailbox-projects.test.ts` | none                         | —                                                                 |
| `UpdateTravelLog`       | deliberately not                  | `mailbox-projects.test.ts` | none                         | regenerates its document from the whole feed                      |
| `UpdateInvestorLog`     | deliberately not                  | `mailbox-projects.test.ts` | none                         | same; the LLM summary path is only exercised with `summarize` off |
| `CreateTrackingProject` | n/a                               | `mailbox-projects.test.ts` | `CreateProjectPanel.stories` | —                                                                 |

## What this exposes

1. **Nothing drives a full Sync → Analyze → Research chain.** Every pipeline is tested in isolation
   with a seeded feed. The cascade's ordering is tested with stub operations; the real passes are
   tested without the cascade. No test or story runs a message from arrival to fact.
2. **The LLM passes are the least observable.** Four suites replay memoized fixtures
   (`classify`, `summarize`, brain `analyze`, CRM skill). That makes them deterministic and offline —
   and means nothing verifies behaviour against a live model except by regenerating fixtures.
3. **Storybook coverage inverts the risk.** 19 stories in plugin-inbox are almost all surface
   (`MessageCard`, `Header`, `Editor`, …). The pipelines have four between them, all in
   `stories-inbox`. JMAP and calendar sync have none.
4. **Three known-dark paths**: JMAP send (no tests at all), on-arrival extraction (commented out),
   and the CRM research agent (never observed).
5. **`MailboxAnalyze` (renamed from `FeedPipeline`) is the closest thing to a workbench that exists** —
   it drives the cascade, every individual pass, the brain and CRM passes, the project pipelines and
   cursor resets, over four seed variants plus a live OPFS mode. What it does NOT do is sync: it reads
   a seeded feed, while `MailboxSync` connects and writes one. The join is the actual gap.

These are the inputs to the workbench question — see the companion task.
