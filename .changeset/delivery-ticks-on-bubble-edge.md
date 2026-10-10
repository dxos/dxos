---
'@dxos/react-ui-assistant': minor
---

A queued prompt's delivery ticks now sit on the prompt bubble's bottom edge instead of adding a line inside it, and its remove control moves into the toolbar under the bubble, which stays shown while the prompt can be removed.

Breaking: `createDeliveryWidget` is removed, and the renderer no longer emits a `<delivery>` tag; `ChatThread` renders the ticks from the message's delivery annotation itself.
