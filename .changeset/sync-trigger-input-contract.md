---
'@dxos/plugin-inbox': patch
---

Fix auto-created mailbox/calendar sync triggers so their `input` carries only `binding`, matching the sync operation's input schema. The trigger no longer smuggles an extra `mailbox`/`calendar` ref into the operation input; the routine is instead discovered through its `binding` cursor's `spec.target`.
