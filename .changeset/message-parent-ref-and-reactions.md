---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

`Message.parentMessage` is now a `Ref<Message>` rather than a bare object id, so a reply resolves its parent through the normal reference machinery (breaking: the schema is bumped to `org.dxos.type.message:0.2.0`, and callers must pass `Ref.make(parent)`). Adds a `Reaction` type (`org.dxos.type.reaction:0.1.0`) — a per-author emoji reaction targeting a message, appended to the same feed and folded at read time — registered by the thread plugin.
