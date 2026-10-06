---
branch: dm/busy-feynman-ie018x
commit: df4ec2c3c7323b4644d4ebc15557d2e61a684a25
base: a33335d55c070833639656c96adcfc58bc7de74b
mode: fast
createdAt: 2026-10-06T05:39:33.040Z
isFinalized: true
groups: 108
rules: [errors-extend-base-error, extract-non-rendering-logic-from-component, no-casts, no-mixed-promise-effect-lifecycle, structured-logging-not-console]
reviewId: df4ec2c3
---

_4 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- df4ec2c3-1 - ignored - no-casts - packages/apps/composer-app/src/functions/_worker.test.ts:21
- df4ec2c3-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- df4ec2c3-3 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:110
- df4ec2c3-4 - ignored - no-casts - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23
- df4ec2c3-5 - ignored - structured-logging-not-console - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:50
- df4ec2c3-6 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:164
- df4ec2c3-7 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/observability/src/ObservabilityExtension.ts:190

## Issues

# ERROR df4ec2c3-1 no-casts `packages/apps/composer-app/src/functions/_worker.test.ts:21`

**Dismissed:** Pre-existing: the `archive`/`env` casts predate this PR; the diff only adds a `query` parameter and two tests.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-34 (`const archive = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN df4ec2c3-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

**Dismissed:** Pre-existing: the chat-creation effect predates this PR; the diff only passes `settings` to `useChatProcessor`.

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR df4ec2c3-3 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:110`

**Dismissed:** Pre-existing: `AiUsageQuotaError` predates this PR; the diff only references it to skip reviewing over-quota turns.

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 110-136 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR df4ec2c3-4 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23`

**Dismissed:** Pre-existing: the story mock cast predates this PR; the diff only adds an `uploadNdjson` stub to it.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-37 (`const makeObservability = (): Observability.Observability =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN df4ec2c3-5 structured-logging-not-console `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:50`

**Dismissed:** Pre-existing: the story `console.log` predates this PR.

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 50-61 (`const StoryLogDownloaderPlugin = () =>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR df4ec2c3-6 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:164`

**Dismissed:** Pre-existing: the `fetchMock.mock.calls` cast predates this PR; the diff only fills `uploadNdjson` in the existing mock helper.

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN df4ec2c3-7 no-mixed-promise-effect-lifecycle `packages/sdk/observability/src/ObservabilityExtension.ts:190`

**Dismissed:** `uploadNdjson` follows the existing Promise-based `Support` API (`uploadLogs`, `flushLogs`); converting the whole interface to Effect is out of scope for this PR.

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 190-197 (`export type Support = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a33335d55c070833639656c96adcfc58bc7de74b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 322 uncertain, 347 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 427 (225 verdicts re-asked with context the model requested)
estimated input tokens: 3207663
billed input tokens: 3053900 (cost $0.1283)
measured chars per token: 3.15
```
