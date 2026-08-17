---
'@dxos/plugin-inbox': patch
---

A service no plugin contributed now skips its scan tier instead of failing the cascade. The tiers'
declared services are resolved eagerly at spawn time, so an uninstalled plugin surfaced as a
`ServiceNotAvailableError` before the handler ran — and only the `AiService` flavour was recognised as
a precondition. Anything else was classified as a genuine failure, which (with `continueOnError` off,
since a later tier consumes the earlier one) aborted the whole run and stranded the deterministic work
behind it. In practice that meant running the `analyze` tier without plugin-brain turned a healthy
mailbox's scan red. The gate is now uniform over the tag and names it in the reason.
