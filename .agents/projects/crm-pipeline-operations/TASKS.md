# CRM Pipeline Operations — Tasks

_Resume: Phase 3 implementation — remove instructions.ts, scaffold operations, tests._

## Phase 1: Review & audit

Understand the current surface area: which operations touch Mailbox messages and
Person/Organization objects, how the email pipeline is triggered, and where the
test coverage sits. Deliverable: AUDIT + spec in
`agents/superpowers/specs/2026-08-02-crm-pipeline-operations-spec.md`.

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

- [ ] **Remove plugin-crm skill instructions.ts and unwire the skill registration**
- [ ] **Scaffold plugin-crm research operations (schemas + handlers, deterministic logic)**
- [ ] **Fixture-driven end-to-end tests for the chosen operations (deterministic)**
- [ ] **Format, lint, test; open PR via submit-pr**

### References

- Spec/audit: `agents/superpowers/specs/2026-08-02-crm-pipeline-operations-spec.md`
