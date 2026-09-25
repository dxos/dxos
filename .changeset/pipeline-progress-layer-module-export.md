---
'@dxos/pipeline': minor
---

Move `Progress.layer` from a static member of the `Progress` service class to a module-level export, so it reads as `Progress.layer` rather than `Progress.Progress.layer`. Breaking for anyone constructing the layer off the class.
