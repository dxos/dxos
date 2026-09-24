---
'@dxos/compute-runtime': patch
---

`ProcessManager` releases a process's handle once it finishes and keeps a summary of the last 200 finished processes for the process monitor, so memory no longer grows with every operation a session runs. A finished process can no longer be `attach`ed, and `list` no longer returns finished processes.
