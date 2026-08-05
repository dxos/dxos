---
'@dxos/react-ui-thread': minor
---

The message composer is `ChatEditor` (`@dxos/react-ui-chat`) rather than its own assembly of editor
extensions, so a thread and the assistant chat submit through one component. `Message.Textbox` no
longer takes `UseTextEditorProps`; its `onSend` is now `(text: string) => boolean` — returning `true`
accepts the message and clears the editor — and `onClear` is gone, superseded by that contract.
`Thread.Textbox` keeps its props and adds only what a thread needs: slash-command and mention
highlighting, the thread placeholder, and the focus handle the header caret activates.
