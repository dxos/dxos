# CRM Pipeline Operations — Tasks

_Resume: watch PR #12441 Check to green; surface Composer preview URL. Last: implementation complete, PR opened._

## Phase 1: Review & audit

Understand the current surface area: which operations touch Mailbox messages and
Person/Organization objects, how the email pipeline is triggered, and where the
test coverage sits. Deliverable: AUDIT + spec in
`packages/plugins/plugin-crm/DESIGN.md`.

### Tasks

- [x] **Review plugin-crm, plugin-projects, plugin-inbox, pipeline-email, stories-inbox** — four parallel explorations, findings in the spec.
- [x] **AUDIT all operations that interact with Mailbox messages and Person/Organization objects** — spec §2.
- [x] **Determine: fixture-driven test that extracts Person/Organization via the pipeline?** — yes, via sync tests + analyze-mailbox; none CRM-owned (spec §3.1).
- [x] **Determine: mechanism to trigger the pipeline from the Mailbox (cursor vs message Feed)?** — yes: `Cursor.makeFeed` + `runFactPipeline` precedent; three cursor mechanisms (spec §3.2).
- [x] **Determine: mechanism to trigger an operation after message sync?** — no completion event by design; feed trigger is the mechanism (spec §3.3).

## Phase 2: Spec

- [x] **High-level spec for CRM-managed actions; map each to existing functionality** — spec §4 (15 actions).
- [x] **Design plugin-crm research routines/operations for Person/Organization** — spec §5.2–5.3 (`ResearchPerson`/`ResearchOrganization`/`ProcessMailbox`).
- [x] **Consider: plugin-crm creates a Project (from template) with routines to run the pipeline on sync** — yes: new `crmPipeline` template, runnable spec + feed trigger (spec §5.4).

## Phase 3: Implementation

Decisions (user, 2026-08-02): remove `plugin-crm/src/skills/crm/instructions.ts`
outright; scaffold + deterministic tests only (LLM research stubbed behind
schemas); docs in `agents/superpowers/specs/`; finish with commits + PR.

### Tasks

- [x] **Remove plugin-crm skill instructions.ts and unwire the skill registration** — skill kept with thin inline instructions; duplicated `src/util/extract-contact.ts` parser removed with it; PLUGIN.mdl + dx.config updated.
- [x] **Scaffold plugin-crm research operations (schemas + handlers, deterministic logic)** — `ResearchPerson` / `ResearchOrganization` / `ProcessMailbox` (cursored, foreign-key-tagged feed cursor) + `crmPipeline` project template (runnable + feed trigger).
- [x] **Fixture-driven end-to-end tests for the chosen operations (deterministic)** — `research.test.ts`, `process-mailbox.test.ts` (feed → cursor → contact → profile chain, idempotency, gate), `crm-pipeline.test.ts`. Found + fixed a plugin-inbox bug: `Mailbox.recordExtraction` dropped the first entry on a fresh mailbox (detached-record `??=` write); regression test added in `Mailbox.test.ts`.
- [x] **Format, lint, test; open PR via submit-pr** — repo lint green, oxfmt clean; PR #12441 opened. CI round 1: plugin-tasks OutlineArticle flake (chip spawned, passed on rerun); stories-inbox ExtractMessageList expected `linked: 2` — calibrated against the recordExtraction first-entry bug — updated to 3 (travel pair → Trip, digest → contact).

## Phase 4: Surface & fixtures

User-directed follow-on (2026-08-03): make the pipeline reachable from the mailbox UI, prove it in
a cross-plugin story, and design the real-fixture path.

### Tasks

- [x] **Wire AnalyzeMailbox-style toolbar action for ProcessMailbox** — `capabilities/mailbox-action.ts` contributes `InboxCapabilities.MailboxAction` ("Process CRM", `research: true`).
- [x] **stories-inbox ProcessMailbox story** — seeds the shared demo fixture + gate Organizations, runs the operation via OperationInvoker; play test asserts 3 persons/profiles/linked + cursor + idempotent re-run (12/12 green).
- [x] **Review fixture capture; design R2 mechanism** — DESIGN.md §8: ArchiveModule star→export→import flow + `MAILBOX_FEED_FIXTURE` consumption reviewed; private `dxos-test-fixtures` R2 bucket design (scoped S3 tokens, phased CLI→presigned-URL upload, token-gated test consumption). Design only.
- [x] **TESTPLAN** — `packages/plugins/plugin-crm/TESTPLAN.md`: storybook smoke, sync, toolbar path, feed-trigger template path, invariants.

### References

- Spec/audit: `packages/plugins/plugin-crm/DESIGN.md`
- Test plan: `packages/plugins/plugin-crm/TESTPLAN.md`
