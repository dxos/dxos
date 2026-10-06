---
'@dxos/echo': patch
---

`createFileProcessor` from `@dxos/log/file-processor` writes the listed `levels` again when it is given no `filters`, and opens its file once instead of leaking a descriptor per entry. Before, a processor built with `levels` alone wrote nothing, so `FILE_PROCESSOR` and blade-runner's per-replicant `agent.log` stayed empty.
