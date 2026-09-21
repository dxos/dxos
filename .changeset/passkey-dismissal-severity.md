---
'@dxos/errors': minor
'@dxos/compute-runtime': patch
'@dxos/plugin-client': patch
'@dxos/plugin-onboarding': patch
---

A user dismissing the passkey prompt no longer reports at error severity.

WebAuthn signals a dismissed (or timed-out) prompt as a `NotAllowedError` `DOMException`, and an aborted signal as `AbortError`. Both reached the production error stream at ERROR — from the process runtime's FAILED transition and from the welcome screen — where they accounted for roughly half of Composer's remaining error-severity logs and hid real regressions.

`@dxos/errors` gains `isCancellation`, which walks an error's `cause` chain for those two `DOMException` names or for the `Cancellation` marker a domain error sets to declare itself a user cancellation. `PasskeyError.Dismissed` now carries that marker, the process runtime reports a cancelled process at `info` under `lifecycle: cancelled`, and the welcome screen reports a dismissal at `info`. Every other failure, including every other `DOMException`, still reports at `error`; no UI behaviour changes.
