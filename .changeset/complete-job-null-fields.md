---
'@dxos/assistant-toolkit': patch
'@dxos/ai': patch
---

Routines no longer burn turns fighting `completeJob`, and a completed job is no longer reported as a failure.

- `completeJob`'s `success`, `failure` and `failure.description` parameters accept an explicit `null` alongside omission. Models routinely emit `null` for the branch they are not using, and the previous optional-only shape rejected that with `Invalid parameters for tool 'completeJob': Expected object | undefined`, so the agent had to guess a second and third encoding of the same completion signal (DX-1189).
- When a call carries both a `success` payload and a `failure`, the success now wins: a model that filled the unused branch with a placeholder was discarding work the routine had actually completed.
- The routine system prompt asks for one branch only, and omission of the other.
- Tool failures log the tool name and error message explicitly, so a rejected tool call is diagnosable from a debug bundle.
