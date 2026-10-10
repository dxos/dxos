---
branch: claude/serene-babbage-6zvzmf
commit: e936297f7d038297fc34fb2a18d3de3d7c3230ed
base: fe083041afb6a6866691d89b9424605f35c381f0
mode: fast
createdAt: 2026-10-07T14:13:25.498Z
isFinalized: true
groups: 53
rules: [declare-optional-services-with-noop-layers, namespace-brand-key-prefixing, no-casts]
reviewId: e936297f7d
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e936297f7d-1 - ignored - namespace-brand-key-prefixing - packages/common/effect/src/SpanAttributes.ts:11
- e936297f7d-2 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:661
- e936297f7d-3 - ignored - no-casts - packages/sdk/observability/src/extensions/otel/tail-sampling.test.ts:98

## Issues

# WARN e936297f7d-1 namespace-brand-key-prefixing `packages/common/effect/src/SpanAttributes.ts:11`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.85. The likeliest place is lines 11-16 (`export const SPACE_ID = 'spaceId';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN e936297f7d-2 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/invitations/invitations-handler.ts:661`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.86. The likeliest place is lines 661-672 (`export const InvitationsHandlerLayer = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e936297f7d-3 no-casts `packages/sdk/observability/src/extensions/otel/tail-sampling.test.ts:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 98-109 (`describe('TailSamplingSpanProcessor', () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fe083041afb6a6866691d89b9424605f35c381f0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 67 uncertain, 82 clean, 0 unanswered
- left for an agentic reviewer: 38 batch(es)

```text
requests: 87 (36 verdicts re-asked with context the model requested)
estimated input tokens: 771838
billed input tokens: 742776 (cost $0.0312)
measured chars per token: 3.12
```

## Dismissals

- e936297f7d-1: `SPACE_ID = 'spaceId'` (line 11) predates this change; the new `SAMPLING.keep` key is already namespaced (`dxos.sampling.keep`).
- e936297f7d-2: `InvitationsHandlerLayer` is untouched by this change.
- e936297f7d-3: the flagged `TailSamplingSpanProcessor` block predates this change; the added test has no casts.
