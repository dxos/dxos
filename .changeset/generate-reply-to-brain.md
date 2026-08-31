---
'@dxos/plugin-inbox': minor
---

`GenerateReply` moved from `InboxOperation` to `BrainOperation`, so **its DXN changed**. Reply
generation now reaches the message surfaces through a new `InboxCapabilities.ReplyGenerator`
capability typed against a shared `ReplyGeneration` contract, rather than plugin-inbox naming the
operation directly — a direct call would invert the plugin dependency, which runs brain → inbox. The
AI-reply affordance is now absent when no generator is contributed, instead of being offered and
failing. With this, plugin-inbox no longer depends on `@dxos/pipeline-rdf` at all.
