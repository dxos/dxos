---
'@dxos/plugin-inbox': patch
---

Mailbox UX fixes: the Gmail sync progress meter now shows a determinate bar (the retrieval total is known once message ids are enumerated); the Topics and Subscriptions articles use the standard `Panel.Toolbar` menu idiom and render their lists (and topic suggestions) via `react-ui-mosaic` `Stack`; selecting a topic opens `TopicArticle` in the companion; the `Topic` type now has a navtree name; and the one-click unsubscribe POST no longer triggers a CORS console error.
