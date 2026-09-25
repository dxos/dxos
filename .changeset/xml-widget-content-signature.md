---
'@dxos/echo': patch
---

Fixed stale tool-call widgets in the chat transcript: a streaming XML tag whose content grows after it closes now re-renders instead of keeping the props it was built from.
