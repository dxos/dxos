---
'@dxos/app-toolkit': patch
'@dxos/observability': patch
---

PostHog events no longer carry a space invitation code in `$current_url`, `$referrer` or their `$initial_*` forms. `@dxos/observability/OtelProxy` forwards OTLP from a Cloudflare Worker to PostHog with the project token. The `ResetDialog` stack trace scrolls inside the dialog instead of running past its edge.
