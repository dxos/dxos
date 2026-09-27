---
'@dxos/plugin-assistant': patch
---

The trace panel mounts only while it is the selected sidebar companion, so a session that never opens it no longer loads the space's whole trace history. Production builds no longer subscribe to the full trace for the dev-only `dxosDumpTrace` console hatch.
