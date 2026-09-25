---
'@dxos/compute-runtime': patch
---

Scheduling an unroutable followup operation in the EDGE runtime no longer fails the operation that scheduled it. `Operation.schedule` is typed as non-failing, but the EDGE-backed `Operation.Service` asserted on a missing `deployedId` — so a handler that scheduled a directly-imported definition (rather than one deserialized from the operation registry) took its caller down with it. Such followups are now logged and dropped. `Operation.invoke` is unchanged and still fails loudly.
