---
'@dxos/observability': minor
'@dxos/plugin-support': minor
---

Replace survey-based feedback capture with PostHog Support tickets.

The feedback panel now has a single submit that files the report through the support service, which creates the PostHog ticket anchoring its telemetry (session replay, events, errors, debug logs) and opens the public Discord help thread. The crash dialog files through the same path. The GitHub-issue action and the separate PostHog/Discord submit buttons are gone.

Breaking, `@dxos/observability`: the `feedback` extension kind and `observability.feedback.captureUserFeedback` are replaced by a `support` kind supplying what only the browser knows — `uploadLogs()`, `sessionContext()`, and `flushLogs(attributes)` — with the ticket itself filed by the service. `Extension.initialize` now receives an `ExtensionContext`, and `setTags` takes an optional kind so tags can be scoped to one signal.

Breaking, `@dxos/plugin-support`: `FeedbackForm.Submit` replaces `SubmitPosthog` / `SubmitGitHub` / `SubmitDiscord` and renders the public-posting notice itself, so no caller can post publicly without showing it. A new `@dxos/plugin-support/SupportService` subpath carries the service client (endpoint plus the two submits) apart from the operation definitions, keeping them off consumers' eager boot graph.
