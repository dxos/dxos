# CRM Pipeline Operations — Tasks

_Resume: exploration phase — review plugin-crm, plugin-projects, plugin-inbox, pipeline-email, stories-inbox._

## Phase 1: Review & audit

Understand the current surface area: which operations touch Mailbox messages and
Person/Organization objects, how the email pipeline is triggered, and where the
test coverage sits. Deliverable: AUDIT + spec in
`agents/superpowers/specs/2026-08-02-crm-pipeline-operations-spec.md`.

### Tasks

- [ ] **Review plugin-crm, plugin-projects, plugin-inbox, pipeline-email, stories-inbox**
- [ ] **AUDIT all operations that interact with Mailbox messages and Person/Organization objects**
- [ ] **Determine: fixture-driven test that extracts Person/Organization via the pipeline?**
- [ ] **Determine: mechanism to trigger the pipeline from the Mailbox (cursor vs message Feed)?**
- [ ] **Determine: mechanism to trigger an operation after message sync?**

## Phase 2: Spec

- [ ] **High-level spec for CRM-managed actions; map each to existing functionality**
- [ ] **Design plugin-crm research routines/operations for Person/Organization**
- [ ] **Consider: plugin-crm creates a Project (from template) with routines to run the pipeline on sync**

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
