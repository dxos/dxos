---
'@dxos/plugin-inbox': minor
---

`AnalyzeMailbox` moved from `InboxOperation` to `BrainOperation`, alongside the `FactStore` layer and
the settings that parameterize it. **Its DXN changed**, so a routine or trigger bound to
`org.dxos.plugin.inbox.operation.analyzeMailbox` no longer resolves and must be recreated from
plugin-brain's "Mailbox Facts" template. `createAnalyzeProgressKey` stays in plugin-inbox — every
monitor key on a mailbox is minted the same way — and the feed-cursor helpers are now exported from
`@dxos/plugin-inbox/operations`, since a contributed processor keeps its cursor on a feed plugin-inbox
owns.
