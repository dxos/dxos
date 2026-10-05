---
'@dxos/compute-runtime': patch
---

`RemoteProcessHandle` retries a failed event read with backoff instead of ending the subscription, so one dropped request no longer stops a remote process's outputs from reaching its subscribers. `@dxos/react-ui-form` number fields take their stepper increment from a new `StepAnnotation`, defaulting to 1 for integers and otherwise 0.1 or 0.01 by the size of the value.
