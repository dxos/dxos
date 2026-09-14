---
'@dxos/compute-runtime': patch
---

An operation still running when the process manager shuts down now ends as an interruption. Shutdown suspends every live process and closes its outputs, which the invoker read as `Process produced no output` and logged as a failed invocation on every teardown that caught an operation mid-flight; only a process that actually finished without an output is a defect now.
