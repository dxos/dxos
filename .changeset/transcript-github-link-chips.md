---
'@dxos/plugin-markdown': minor
'@dxos/plugin-github': patch
'@dxos/plugin-assistant': patch
'@dxos/react-ui-assistant': minor
'@dxos/react-ui-feed': minor
---

GitHub pull request and issue links in a chat transcript render as link chips, as they do in documents. `MarkdownCapabilities.TextExtension` lets a plugin decorate text that is not a markdown document, and the chat thread, `ChatThread.Root` and `MessageList.Root` take an `extensions` prop to apply them.
