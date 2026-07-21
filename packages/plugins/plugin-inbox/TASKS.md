# plugin-inbox — Tasks

\_Resume: task #7 (JMAP e2e) is done and green; next is #6 (unskip agent-e2e) or #8-#11 (bench/
traceability/live runbook), whichever the user prioritizes next. Uncommitted: none. Last: relocated
the HTTP mock (`createInboxHttpMock`) out of `plugin-inbox` entirely, into
`composer-app/src/playwright/plugins/inbox-http-mock.ts` — it has exactly one consumer and belongs
next to it, not in the plugin. `plugin-inbox`'s `./testing` export is now conditional (`node`/
`default`, mirroring the existing `#plugin`/`#capabilities` internal-import pattern): the `default`
(storybook/vite-dev) branch stays `InboxPlugin` + fixtures; the `node` branch exports only
`gmail-fixtures`/`jmap-fixtures` + the `Jmap`/`GmailDataset`/`JmapDataset` type contracts the
relocated mock needs — deliberately NOT `InboxPlugin` (breaks under Playwright's Node loader, no
`.pcss` support) NOR `builder`/`data` (pull in `Mailbox` → `@dxos/compute`'s `Instructions` →
the AI parser's `parsimmon` dep, which Playwright's esbuild loader mishandles differently than
Vite). Also: dropped the reply-test's `EmailSubmission/set` poll timeout override (measured ~350-865ms
actual latency against the 15s override — pure historical over-caution) and added a success-toast
assertion (`getByTestId(/^notify-success-/)`, the process-invocation framework's toast id
convention).

## Test suite — PLUGIN.mdl enforcement

Layered suite (tiers: unit → storybook → harness → agent-e2e → browser-e2e → bench →
live) enforcing every `PLUGIN.mdl` acceptance scenario (`test T-#`); each test carries
its spec id / `spec:T-#` tag and each acceptance block carries a harness tag so a
traceability check (#10) fails when a scenario loses enforcement. **Current branch
delivers Tier 4 (browser-e2e, task #7).**

### Tasks

- [x] **#7 Browser-e2e Playwright inbox spec — THIS BRANCH — DONE (JMAP; Gmail split to #7e)**
  - `composer-app/src/playwright/` specs + `plugins/inbox.ts` helper. Run: `moon run composer-app:e2e`.
  - **Provider-parameterized structure.** Provider-specific behaviour (sync, reply) is tested for
    BOTH providers via a shared test body + a per-provider adapter; generic mailbox behaviour
    (select thread, open companion, etc.) is written once. Adding a future provider = one adapter.
  - **JMAP suite — always runs.** Drives the REAL creation flow: fill the JMAP credential _form_
    (host = mock URL, fake access token) — no OAuth, no env var, no ECHO seeding. Hosts:
    JMAP sync + JMAP reply (provider-specific) AND all **generic mailbox tests** (thread select,
    companion, T-10/T-11 perceived behaviour) so they always run in CI.
  - **Gmail suite — gated; skipped unless its env var is set.** Can't drive OAuth, so: seed the
    `accessToken` ECHO object (app boots "connected") + set the env var that swaps Gmail's base URL
    to the mock. Tests Gmail sync + Gmail reply only. `test.skip` when the env var is absent.
  - **Base-URL swap.** JMAP host comes from the form (`target.apiUrl`, already per-binding — no
    change). Gmail hosts are hardcoded module consts → **refactor to read a base URL from an env var**
    (only var needed; Gmail-only). Both providers point at one Effect `HttpApp` mock.
  - **Mock.** Effect `HttpApp` whose handlers `Schema.encode` the shared response Schemas
    (`Message`, `ListMessagesResponse`, `LabelsResponse`, `ErrorResponse`); JMAP bound to a port and
    referenced by the form host; Gmail reached via the env-var base URL. Never drive Google's login
    UI (2FA is non-deterministic + blocked). Keep `DX_PWA=false` to avoid the SW interception gap.
  - **Conventions:** follow the `browser-e2e-tests` skill — target by `data-testid` only, never
    labels/roles. Inbox UI is missing them: reply/AI-reply/forward/generate toolbar actions expose
    no testid (add `properties.testId` — `@dxos/react-ui-menu` only emits one when set), and message
    tiles (`MessageStack`) / mailbox list have none. Add testids as a first step.
  - **Decisions (settled).** Mock = one Effect `HttpApp` served via Playwright `page.route`
    interception for both providers (Gmail `googleapis.com`; JMAP well-known + discovered `apiUrl`) —
    no product base-URL refactor. JMAP: drive the REAL credential form (host `mail.test`, fake
    token). Gmail: inject the Connection/AccessToken/Mailbox/SyncBinding via a dev/e2e-gated bridge
    (no OAuth, no seed bridge exists). Trigger sync via the existing mailbox **Sync** graph action
    (`sync-mailbox.label`) — runs client-side today, so `page.route` catches its fetches.
  - **⚠ Productionization dependency.** These tests rely on sync running IN THE BROWSER. Sync is not
    yet on edge; when it moves, add an env-var flag to force in-browser sync for e2e, or the mocked
    HTTP (page.route) won't intercept it. Same for the Gmail connection bridge staying dev/e2e-gated.
  - Build order: [x] (a) inbox testids — Sync action (`inbox.mailbox.sync`), reply/replyAll/forward/
    aiReply (`inbox.message.*`), generate (`inbox.draft.generate`), message+conversation rows
    (`inbox.message.row`/`inbox.conversation.row`), mailbox root (`inbox.mailbox`); companion via
    existing `message-header`, send via existing `save-button`. Compiles + lints.
    [x] (b) HTTP mock — `composer-app/src/playwright/plugins/inbox-http-mock.ts` (`createInboxHttpMock`;
    Gmail REST + JMAP envelope, fixture-backed, mirrors the in-memory filter/sort/paginate; also
    implements JMAP send which the in-memory mock omits), consuming `generateGmailDataset`/
    `generateJmapDataset` + `Jmap`/`GmailDataset`/`JmapDataset` from `@dxos/plugin-inbox/testing`
    (its one consumer, so it lives in composer-app rather than the plugin); `page.route` bridge
    `composer-app/src/playwright/plugins/inbox.ts` (`installInboxMock`). Typechecks.
    [x] (c) `plugins/inbox.ts` page-object (JMAP form-fill, sync, select-thread, reply) — Gmail
    connection bridge + provider adapter still to come with (e).
    [x] (d) JMAP suite (`composer-app/src/playwright/inbox.spec.ts`): connect+sync ✓, select-thread ✓
    (generic, always-runs), reply ✓ (round-trips through the mock's JMAP submission). All 3 green in
    chromium. Reply body is the last `.cm-content` (CodeMirror, not a role=textbox / not in the
    edit-email-form testid); assert on the mock's recorded `EmailSubmission/set`.
    [ ] (e) Gmail suite (gated on DX_E2E): add the `window.composer` connection-injection bridge
    (DX_E2E runtime flag), provider adapter to share the generic bodies, Gmail sync + reply.
    Deferred per user — not started.
  - Validation: `DX_PWA=false ... playwright test inbox.spec.ts` (chromium) — 3 passed. Bundle built
    with `DX_PWA=false DX_E2E=1`.
  - **Review-fix round** (code-review comments on PLUGIN.mdl + http-mock.ts, each verified against
    runtime before fixing): `draftEmailAndOpen`'s spec input/output now matches its actual schema
    (`db` required, compose fields optional, no output — was a fictional string/DXN); `jmapSync`
    output is `{ newMessages: number }` not a bare `number`; `http-mock.ts` reuses `Jmap.MethodCall`/
    `Jmap.Filter` from the shared JMAP API module and validates the JSON body once at the request
    boundary (rejects malformed input) instead of an unchecked cast. Skipped `renameFilter`'s
    finding — the runtime doesn't take a replacement name as an operation input at all (arrives via a
    `LayoutOperation.UpdatePopover` callback, UI-mediated); speccing one would misrepresent it.
  - **Survived two upstream refactors** (merged from main, re-verified 3/3 green after each): (1)
    `plugin-connector: drive connector-auth from a schema annotation + one graph extension` (#12218)
    replaced `ConnectorAuthButton`/`InitializeAction` with `connectorAuthActions` — testids moved to
    `connectorPlugin.connect(.{id})`, `AppNode.makeToolbarActionGroup` gained an optional `testId`.
    (2) the vite+rolldown library build (#11319, flattened `dist/lib/` — no more `neutral/`, fixed the
    `./testing/http-mock` export path) landing alongside `plugin-inbox: incremental mail sync +
unified system tags` (#12248, moved the manual sync button from an inline `MailboxArticle`
    action into a multi-disposition `['toolbar','list-item']` graph action calling `syncTarget(mailbox)`)
    and the "conversation mosaic stack with per-message toolbars" redesign (#12247, renamed
    `Message/useToolbar.tsx` → `ConversationStack/useToolbar.tsx` and moved Reply behind a "more"
    overflow menu — only Reply All stays directly visible). `react-ui-menu`'s `MenuBuilder.menu()`
    gained an optional `testId` param (mirrors `makeToolbarActionGroup`) for the new overflow trigger.
  - **Reply e2e simplified**: clicks `inbox.message.replyAll` directly instead of opening the "more"
    overflow menu first — Reply All is the one reply-family action always visible on the toolbar,
    same send-validation coverage with fewer steps.
  - Follow-ups (deferred per user): Gmail bridge + suite (#7e); provider-parameterized adapter
    (introduce when Gmail gives the shared generic bodies a second consumer).
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
  `draftEmailAndOpen`/`jmapSync` op blocks corrected to match runtime (see review-fix note above).
- `.agents/skills/browser-e2e-tests/SKILL.md` — testid-first authoring convention this suite follows.
- PR: #12197.

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
