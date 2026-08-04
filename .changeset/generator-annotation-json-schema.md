---
'@dxos/echo': patch
'@dxos/plugin-tasks': patch
---

Allow the object form of `GeneratorAnnotation` (`{ generator, args }`) in serialized JSON schema, so operations referencing schemas that use it (e.g. `Task`) can be registered on remote hosts. Adds a workerd entry point for the tasks plugin so its operations can run headlessly.
