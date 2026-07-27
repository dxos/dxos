---
'@dxos/plugin-markdown': patch
---

Report passkey login failures on the welcome screen instead of silently doing nothing. `RedeemPasskey` now fails with `PasskeyDismissedError`, `PasskeyRejectedError`, or `PasskeyLoginError`, which `classifyPasskeyFailure` maps to a message.
