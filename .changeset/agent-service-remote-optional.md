---
'@dxos/echo': patch
---

`AgentService` reads `RemoteProcessManager` from context instead of requiring it, so a stack that
hosts only local agents keeps its `AgentService`. A `LayerSpec` stack prunes a provider whose
requirements are unmet, which dropped `AgentService` entirely wherever no edge runtime was
provided. `AgentServiceOptions.getRemoteManager` supplies the manager where it cannot be read
from context.
