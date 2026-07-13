# plugin-inbox — Tasks

## Test suite — PLUGIN.mdl enforcement

Layered suite (tiers: unit → storybook → harness → agent-e2e → browser-e2e → bench →
live) enforcing every `PLUGIN.mdl` acceptance scenario (`test T-#`); each test carries
its spec id / `spec:T-#` tag and each acceptance block carries a harness tag so a
traceability check (#10) fails when a scenario loses enforcement. **Current branch
delivers Tier 4 (browser-e2e, task #7).**

### Tasks

- [ ] **#7 Browser-e2e Playwright inbox spec — THIS BRANCH**
  - `composer-app/src/playwright/inbox.spec.ts` + `plugins/inbox.ts` helper.
  - Scenarios: interactivity-during-sync (T-10), no-false-empty-state (T-11), selection→companion.
  - Run: `DX_PWA=false moon run composer-app:e2e`. Seed deterministically — never live creds here.
  - **Approach (OAuth/mock).** Never drive Google's login UI: 2FA (TOTP/push/passkey) is
    non-deterministic and Google blocks automation — a scripted `accounts.google.com` login rots
    into permanent-red. Split the two OAuth seams instead:
    - Seed the `accessToken` ECHO object directly (reuse `seedMailboxBinding`) so the app boots
      "connected" — skips consent/2FA because it skips the reason they exist. (Token is persisted
      by `capabilities/connector.ts` as `{ token, account, source }`.)
    - Mock the API: small Effect `HttpApp` whose handlers `Schema.encode` the shared response
      Schemas (`Message`, `ListMessagesResponse`, `LabelsResponse`, `ErrorResponse`) →
      `HttpApp.toWebHandler`/`toWebHandlerLayer` (`Request => Promise<Response>`, no socket) →
      bridged into `page.route('**/gmail.googleapis.com/**')` (build Fetch `Request`, call handler,
      `route.fulfill`). No base-URL refactor, no port/CORS, real routing + schema-checked bodies,
      same app reusable by node tests.
    - Get right: provide fixtures via `toWebHandlerLayer(app, MockFixtureLayer)`; binary bodies
      (base64url raw messages) via `arrayBuffer()`/`Buffer`; only browser-originated requests are
      caught (Google calls are client-side per the `connector.ts` CORS comment); keep `DX_PWA=false`
      to avoid the service-worker interception gap.
    - **JMAP is the primary data path** — `target.apiUrl` is already per-binding, so point a seeded
      binding at the same `HttpApp` bound to a port; zero interception, more contract reuse. Most
      of T-10/T-11/companion-flow don't care whether bytes came from Gmail or JMAP.
- [ ] **#6 Unskip inbox agent-e2e** — `assistant-e2e/src/testing/inbox-enable.test.ts`
    (register the skill), then add read/draft scenario tests. Enforces F-6.
- [ ] **#8 Latency benchmarks with budget assertions** — F-11.3/F-11.4 at N=1k/4k/10k; fail above
    the 400ms p95 ceiling and track against the 100ms target. Budgets in `src/testing/budgets.ts`
    shared with `PLUGIN.mdl`. Depends on F-11 code fixes (below).
- [ ] **#9 Overlapping-sync duplicate test** — Tier 0 executable spec of T-13's concurrency clause;
    expected-fail until the F-11.5 mailbox lock lands.
- [ ] **#10 Spec↔test traceability check** — moon task parsing `PLUGIN.mdl` `test T-#` ids; fails
    when an id has neither an automated test nor a runbook entry.
- [ ] **#11 Live-validation runbook** — normalize credential-gated suites into one Tier 6:
    `GOOGLE_ACCESS_TOKEN` (a human clears 2FA once with `access_type=offline&prompt=consent`; store
    the **refresh token** as a secret, exchange at runtime), `JMAP_TOKEN` (+ vitest tag),
    `functions-e2e`. Runbook enumerates human-verified assertions → T-1/T-3/T-6/T-7/T-8/T-13.

### F-11 responsiveness — implementation ideas (gate T-10/T-11/T-12)

Product-code fixes the perceived-latency scenarios depend on (approaches, not yet tasked to this
branch): false empty state → render cached/skeleton over persisted messages (F-11.2); first-page
budget → index-backed pagination (F-11.3); companion budget → synchronous companion seed on select
(F-11.4); overlap safety → run sync on edge with a mailbox lock, feed-level dedup by foreign key as
interim backstop (F-11.5); sync main-thread contention (F-11.1).

### References

- `PLUGIN.mdl` — acceptance scenarios T-1..T-13, `feat F-11` responsiveness reqs (400ms ceiling /
  100ms target). Spec is the single source of truth for requirements; this ledger holds approach.

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
