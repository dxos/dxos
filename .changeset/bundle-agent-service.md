---
'@dxos/protocols': minor
'@dxos/compute': minor
'@dxos/compute-runtime': minor
'@dxos/agent-runtime': minor
'@dxos/edge-compute': patch
---

An operation that runs in a plugin bundle on EDGE gets the full `Agent.Service` from the EDGE process that hosts its session (`PluginProtocol.InvocationScope.agent`), and the bundle runs no process of its own. There, `Agent.running` answers an atom fixed at the time of the call rather than a live one, since a live atom would hold an RPC open past the invocation. `Agent.conversationService` is removed. The `ProcessProtocol` decoders are now `ProcessProtocolCodec` in `@dxos/compute-runtime/remote-process`, and `@dxos/agent-runtime` exports `prepareSessionDelegation` and `prepareAgentDelegation`.
