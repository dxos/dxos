---
'@dxos/react-ui-assistant': patch
---

Streaming an assistant turn no longer re-renders the whole chat. Folded tool runs keep their identity between updates, message toolbars re-render only when their own message changes, and the chat's toolbar, composer and checklist no longer re-render on every streamed block.
