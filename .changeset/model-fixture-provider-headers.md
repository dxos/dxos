---
'@dxos/ai': patch
---

Model-fixture conversations no longer persist the provider's request and response headers. The committed store carried the account's `anthropic-organization-id` and `anthropic-workspace-id` alongside per-run `request-id`, tracing (`traceparent`, `b3`, `cf-ray`) and rate-limit values; replay reads none of them, and the rate-limit values churned every fixture on regeneration. The surrounding `method`/`url`/`status` are kept, and existing fixtures are scrubbed in place — the store hashes over the parameters and prompt only, so lookups are unaffected.
