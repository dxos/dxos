# plugin-inbox — Design & decisions

The _why_ behind the inbox work-streams. The task ledger is `TASKS.md`; the product
spec is `PLUGIN.mdl`. This document captures test-suite architecture and cross-session
design decisions.

## Test suite — layered enforcement of PLUGIN.mdl

**Goal:** a layered suite that mechanically enforces the `PLUGIN.mdl` spec — every
acceptance scenario (`test T-#`) is enforced by at least one automated tier, or by an
explicit entry in the semi-automated live runbook. Spec and suite stay in sync via a
traceability convention + check (§5).

### 1. Current state (audit, 2026-07-12)

**Strong:** 35 unit-test files (~3.7k lines) with good fixture infrastructure
(`src/testing/`: `gmail-fixtures`, `jmap-fixtures`, `sync-fixture` (`seedMailboxBinding`,
`inboxSyncTestServices`), `otel-harness`, `email-processor`). Sync (Gmail + JMAP) has
mock-API pipeline tests including re-run no-op and mid-run crash recovery; extractors,
filters, mappers, markdown processing, fact enrichment, and tags/starring are covered.
`InboxPlugin.test.ts` is an activation smoke test on `createComposerTestApp`.

**Gaps:**

| # | Gap | Task |
|---|-----|------|
| 1 | Agent e2e for the inbox skill is written but `describe.skip`ped (`assistant-e2e/src/testing/inbox-enable.test.ts` — skill not found in registry) | #6 |
| 2 | Zero browser-e2e coverage: no inbox spec in `composer-app/src/playwright` | #7 |
| 3 | Benchmarks are local-only (`DX_BENCH` gate), print tables, assert no budgets, no CI/perf tracking; nothing measures the F-11.3/F-11.4 latency budgets | #8 |
| 4 | No test exercises overlapping sync runs (the F-11.5 failure mode found in the audit) | #9 |
| 5 | No spec↔test traceability; nothing fails when a `PLUGIN.mdl` scenario loses its enforcement | #10 |
| 6 | Live-account suites are inconsistent: `calendar/sync.test.ts` gates on `ACCESS_TOKEN` (vs `GOOGLE_ACCESS_TOKEN` elsewhere); `jmap/mail/sync-e2e.test.ts` has no vitest tag; no runbook | #11 |
| 7 | UI-behavior blind spots: nothing tests the false-empty-state (F-11.2) or companion-latency path; 16 story files exist but none assert inbox behavior | #7, #8 |

CI facts the plan builds on: the `Check` workflow's `test` job runs `moon run :test
:test-browser --affected` with `VITEST_TAGS_FILTER='!sync && !sync-e2e && !functions-e2e
&& !manual'`; `storybook` runs `:test-storybook` on PRs; the Playwright `e2e` job runs only
on main/release branches or `workflow_dispatch e2e=true`; benchmarks and credential-gated
suites never run in CI.

### 2. Tier architecture

Tiers are cumulative — each catches what the tier below structurally cannot.

- **Tier 0 — Unit (vitest node, every PR).** Pure logic + pipelines against mocks/fixtures.
  `plugin-inbox/src/**/*.test.ts`. Additions: overlapping-sync duplicate test (#9, executable
  spec of T-13's concurrency clause; expected-fail until the F-11.5 lock lands); a
  query-settled/empty-state unit around the `usePagination` signal once #1 lands it.
- **Tier 1 — Storybook interaction tests (every PR).** Portable stories with play-functions —
  the natural home for the F-11.2 state machine (pending vs resolved-empty vs populated) once
  the settled signal exists. `*.stories.tsx` + `moon run plugin-inbox:test-storybook`.
- **Tier 2 — Harness/operation tests (every PR).** `createComposerTestApp({ plugins })` +
  `harness.invoke(op)` for operation contracts needing real plugin wiring. Extend
  `InboxPlugin.test.ts`.
- **Tier 3 — Agent e2e, memoized LLM (every PR, replay).** `assistant-e2e` `agentTest(...)`
  driving the inbox skill with memoized conversations; regenerate via `ALLOW_LLM_GENERATION` +
  `regenerate-memoized-llm`. Unskip `inbox-enable.test.ts` (#6), then scenario tests. Enforces F-6.
- **Tier 4 — Browser e2e, Playwright (main/release + on-demand).** Real Composer in a browser —
  the only tier that enforces the *perceived* requirements: interactivity during sync (T-10), no
  false empty state on reload (T-11), selection→companion flow. `composer-app/src/playwright/
  inbox.spec.ts` + `plugins/inbox.ts` helper (#7). Run: `DX_PWA=false moon run composer-app:e2e`.
  Seed deterministically — never live credentials in this tier. **See §6 for the OAuth/mock design.**
- **Tier 5 — Benchmarks with budget assertions (on-demand + scheduled).** Fixture-seeded feeds at
  N = 1k/4k/10k; measure and *assert*: mailbox open→first page ≤ 400ms (F-11.3/T-12); message
  select→message+thread resolved ≤ 400ms (F-11.4/T-12); sync throughput regression rails. Budgets
  in one `src/testing/budgets.ts` referenced by both bench and `PLUGIN.mdl` (#8). Caveat: in-process
  `EchoTestBuilder` fidelity ≠ browser; Tier 4 owns the user-perceived numbers, Tier 5 owns cheap
  regression detection at scale.
- **Tier 6 — Semi-automated live validation (manual, real accounts).** Normalize the credential-gated
  suites into one documented tier (#11): Google token→`GOOGLE_ACCESS_TOKEN` (normalize
  `calendar/sync.test.ts` off `ACCESS_TOKEN`); JMAP/Fastmail token→`JMAP_TOKEN` (+ optional
  `JMAP_HOST`, add the missing vitest tag); edge functions `functions-e2e`-tagged. Runbook enumerates
  human-verified assertions → T-1/T-3/T-6/T-7/T-8/T-13.

### 3. Spec coverage map (PLUGIN.mdl acceptance → tiers)

| Spec | Scenario | Enforced by (today) | Target tiers |
|------|----------|---------------------|--------------|
| T-1 | Gmail sync populates feed | unit (`gmail/sync.test.ts`, mock) | unit + live |
| T-2 | Save/apply filter | unit (`match-filter.test.ts`, partial) | unit + browser-e2e |
| T-3 | Draft and send reply | unit (`createDraftMessage`); `send.test.ts` (live) | unit + live |
| T-4 | Classify message | unit (`classify` path) | unit + agent-e2e |
| T-5 | Extract confirmation | unit (`extract-message/extract-mailbox`) | unit |
| T-6 | Draft event round-trip | `calendar/sync.test.ts` (live) | live + browser-e2e |
| T-7 | Delete event/email | — (gap) | unit + live |
| T-8 | JMAP sync populates feed | unit (`jmap/mail/sync.test.ts`); live (`sync-e2e`) | unit + live |
| T-9 | Enrich mailbox facts | unit (`enrich-mailbox.test.ts`) | unit + storybook |
| T-10 | Interactive during sync | — (gap) | browser-e2e |
| T-11 | No false empty state | — (gap; code currently violates it) | storybook + browser-e2e |
| T-12 | 400ms latency budgets | — (gap) | bench + browser-e2e |
| T-13 | Idempotent sync incl. overlap | unit (sequential + crash only) | unit (overlap, #9) + live |

### 4. Deficiency backlog

Code (F-11 audit) — prerequisites for some browser-e2e scenarios: #1 false empty state (F-11.2),
#2 index-backed pagination (F-11.3), #3 synchronous companion seed (F-11.4), #4 edge sync + mailbox
lock (F-11.5), #5 sync main-thread contention (F-11.1 caveat).
Testing: #6 unskip inbox agent-e2e, #7 inbox Playwright specs, #8 latency benchmarks with budgets,
#9 overlapping-sync duplicate test, #10 spec↔test traceability check, #11 live-validation runbook.

### 5. Keeping spec and suite in sync

1. Every automated test enforcing a scenario carries the spec id in its name
   (`test('T-13: overlapping syncs do not duplicate', …)`) or a `spec:T-13` vitest tag.
2. `PLUGIN.mdl` acceptance blocks carry harness tags (`[unit]`, `[storybook]`, `[agent-e2e]`,
   `[browser-e2e]`, `[bench]`, `[live]`) declaring where each is enforced.
3. A check script (moon task) parses `PLUGIN.mdl` for `test T-#` ids and fails when an id has
   neither a matching automated test nor a runbook entry (#10).
4. Process rule: feature changes update `PLUGIN.mdl` first; the traceability check then forces the
   corresponding suite update in the same PR.

## 6. Browser-e2e OAuth & API-mock design (Tier 4, task #7)

The design settled for the current branch. Grounded in `capabilities/connector.ts` (OAuth brokered
via `@dxos/plugin-connector`, token persisted as an `accessToken` ECHO object `{ token, account,
source }`), `apis/google/*/api.ts` (hosts hardcoded as module `const API_URL`; ad-hoc
`HttpClientRequest`, **not** an Effect `HttpApi` contract), and `apis/jmap/*` (`jmapRequest(target.apiUrl, …)`
— host already configurable per binding).

**Principle: never drive Google's login UI in an automated test.** Google detects/blocks automation,
and 2FA (TOTP/push/passkey/device-trust) is non-deterministic and against consumer-account ToS. A
Playwright spec that types a password + TOTP into `accounts.google.com` passes for a week then rots
into a permanent-red everyone ignores — worse than no coverage. Split OAuth into two independently
testable seams instead.

**Tier 4 (browser-e2e): seed the token, mock the provider.**
- Seed the `accessToken` ECHO object directly (reuse `seedMailboxBinding`) so the app boots already
  "connected" — skips the entire consent/2FA flow because it skips the reason it exists.
- Mock the API responses. The chosen mechanism (best of three): build a small Effect **`HttpApp`**
  whose handlers `Schema.encode` the shared response Schemas (`Message`, `ListMessagesResponse`,
  `LabelsResponse`, `ErrorResponse` — contract-accurate by construction), convert it to a web handler
  with **`HttpApp.toWebHandler`/`toWebHandlerLayer`** (`(Request) => Promise<Response>`, no socket),
  and bridge it into Playwright **`page.route('**/gmail.googleapis.com/**', …)`** → build a Fetch
  `Request` from the intercepted request, call the handler, `route.fulfill` the `Response`.
  - Advantages: no base-URL refactor (fulfill matches the real host), no port/CORS/teardown, real
    routing + schema-encoded bodies, and the same `HttpApp` is reusable by node-side tests (bind to a
    port, or `fromWebHandler`).
  - Get right: provide services via `toWebHandlerLayer(app, MockFixtureLayer)`; binary bodies (base64url
    raw messages) via `arrayBuffer()`/`Buffer`, not `.text()`; only browser-originated requests are
    caught, so confirm each endpoint is client-side (the `connector.ts` CORS/tracer-disable comment
    confirms Google calls are) and keep `DX_PWA=false` to avoid the service-worker interception gap.
    `toWebHandler` does not synthesize the Gmail contract — you still author the small router once.

**JMAP is the path of least resistance:** `target.apiUrl` is already per-binding, so point a seeded
binding at the same `HttpApp` bound to a port — zero interception, more contract reuse (JMAP is a
single POST-with-method-envelope). Make JMAP the primary Tier 4 data path; most of T-10/T-11/
companion-flow don't care whether bytes came from Gmail or JMAP.

**Tier 6 (live): human clears 2FA once, offline.** A human runs the interactive consent once
(`access_type=offline&prompt=consent`, per the `send.test.ts` OAuth-playground doc comment), captures
the **refresh token** as a secret; the suite exchanges refresh→access at runtime into
`GOOGLE_ACCESS_TOKEN`. No interactive step at test time — the refresh token is the durable proof a
human already cleared 2FA. (A Workspace service account with domain-wide delegation would remove even
that, but needs a Workspace domain — only worth it if this tier ever runs unattended in CI.)

**Rejected alternatives:** a real localhost mock server (needs the Google base-URL refactor + port
lifecycle) and bare `page.route` hand-fulfill (loses routing and node-side reuse). The
`HttpApp.toWebHandler` + `page.route` bridge dominates both for Google.
