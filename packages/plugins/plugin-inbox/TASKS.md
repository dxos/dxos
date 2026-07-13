# plugin-inbox — Tasks

## Test suite — PLUGIN.mdl enforcement

Layered suite enforcing every `PLUGIN.mdl` acceptance scenario (`test T-#`) — see
`DESIGN.md` for tier architecture, the spec↔tier coverage map, and the browser-e2e
OAuth/mock design (§6). **Current branch delivers Tier 4 (browser-e2e, task #7).**
The F-11 code deficiencies (#1–#5) are tracked separately and gate a few scenarios
(T-10/T-11/T-12) — noted where relevant.

### Tasks

- [ ] **#7 Browser-e2e Playwright inbox spec — THIS BRANCH**
  - `composer-app/src/playwright/inbox.spec.ts` + `plugins/inbox.ts` helper.
  - Helper: seed the `accessToken` ECHO object (reuse `seedMailboxBinding`) so the app
    boots connected — no Google login / 2FA driven.
  - Mock provider: small Effect `HttpApp` over the shared response Schemas →
    `HttpApp.toWebHandler` → bridged into Playwright `page.route('**/gmail.googleapis.com/**')`.
    Primary data path via JMAP (`target.apiUrl` → same app bound to a port). Keep `DX_PWA=false`.
  - Scenarios: interactivity-during-sync (T-10), no-false-empty-state (T-11), selection→companion.
  - Run: `DX_PWA=false moon run composer-app:e2e`.
- [ ] **#6 Unskip inbox agent-e2e** — `assistant-e2e/src/testing/inbox-enable.test.ts`
    (register the skill), then add read/draft scenario tests. Enforces F-6.
- [ ] **#8 Latency benchmarks with budget assertions** — assert F-11.3/F-11.4 400ms budgets at
    N=1k/4k/10k; budgets in `src/testing/budgets.ts` shared with `PLUGIN.mdl`. Depends on #2/#3.
- [ ] **#9 Overlapping-sync duplicate test** — Tier 0 executable spec of T-13's concurrency clause;
    expected-fail until the F-11.5 mailbox lock (#4) lands.
- [ ] **#10 Spec↔test traceability check** — moon task parsing `PLUGIN.mdl` `test T-#` ids; fails
    when an id has neither an automated test nor a runbook entry.
- [ ] **#11 Live-validation runbook** — normalize credential-gated suites (`GOOGLE_ACCESS_TOKEN`,
    `JMAP_TOKEN`, `functions-e2e` tag) into one documented Tier 6 with human-verified assertions.

### References

- `DESIGN.md` §1–6 (audit, tiers, coverage map, sync convention, OAuth/mock design).
- `PLUGIN.mdl` — acceptance scenarios T-1..T-13, `feat F-11` responsiveness reqs.

## Mailbox reply & triage

Reply drafting plus signals to decide which messages are worth replying to.
`Message.properties` is an open `Record(String, Any)`, so per-message signals
can be recorded there without a schema change. The Gmail sync mapper
(`operations/google/gmail/mapper.ts`) has the raw headers at map time.

### Tasks

- [ ] **Operation to unsubscribe**
  - A DXOS Operation that unsubscribes from a message's list using the
    `List-Unsubscribe` header (mailto: or one-click HTTPS POST per RFC 8058,
    honoring `List-Unsubscribe-Post`).
  - Reads the signal recorded on `properties.listUnsubscribe` (see detection
    task); surfaced as a message action.
  - Network action → confirm before sending (see safety rules).
- [ ] **Auto/bulk detection → gate draft creation**
  - [x] Sync mapper detects a no-reply sender and reads the `List-Unsubscribe`
        header, recording `properties.noReply` / `properties.listUnsubscribe`
        (`Mailbox.isNoReplyAddress`, `mapper.ts`).
  - [x] Shared `Mailbox.isReplyable(message)` helper (false when no-reply or
        unsubscribe present; falls back to sender address for older fixtures).
  - [x] Wire `isReplyable` into the draft flow — harness `pipelines/draft.ts`
        skips non-replyable mail (no LLM call, `skipped: true`); 21/110 fixture
        messages skip via the sender-address fallback. Product draft flow TBD.
- [ ] **User-editable Instructions inform reply drafting**
  - [x] Reuse the existing `@dxos/compute` `Instructions` type (`text` markdown +
        `skills` + `objects`) — did not define a new one.
  - [x] Added optional `instructions: Ref(Instructions)` to the `Mailbox` schema
        (select a shared Instructions or create per-mailbox, via the Form picker).
  - [x] Draft prototype threads an `instructions` string (`pipelines/draft.ts`
        `DraftOptions`, `DRAFT_INSTRUCTIONS` env) into the prompt.
  - [ ] Reply generator reads `mailbox.instructions?.target` and merges its
        `text` + `skills` into the session/system prompt (skills resolved to their
        tool/prompt contributions, as Routines do). Needs the product reply flow.

### References

- Draft-reply benchmark + illocution (speech-act) classification: `packages/stories/stories-brain` (`pipelines/draft.ts`, `pipelines/questions.ts`).
- Sync stats + body-part coverage: `operations/google/gmail/sync.ts`.
