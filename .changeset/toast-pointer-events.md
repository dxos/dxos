---
'@dxos/react-ui': patch
---

Toasts consume clicks over their own surface again: while a modal menu or dialog is open, a toast is
no longer transparent to hit-testing, so clicks landing on it can no longer fall through to the UI it
covers. The toast viewport itself stays click-through, so the surrounding app remains interactive.
