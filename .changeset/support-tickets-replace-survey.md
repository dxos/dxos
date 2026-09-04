---
'@dxos/plugin-support': minor
---

Replace survey-based feedback capture with PostHog Support tickets: the feedback panel now has a single submit that files the report as a support ticket anchoring its telemetry (replay, events, errors, debug logs) and opens the public Discord help thread. The GitHub-issue submission action, the separate PostHog/Discord submit buttons, and the `feedback` observability API (`observability.feedback.captureUserFeedback`) are removed in favor of `observability.support.createSupportTicket` — a breaking rename for consumers of the Observability feedback API.
