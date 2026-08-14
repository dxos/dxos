---
'@dxos/plugin-inbox': patch
---

A failed scan processor now blocks only its descendants in the topology; independent branches still
run. Previously the cascade aborted by run POSITION, so a failing processor stranded everything after
it in the list — `subscriptions` declares no edge to `classify`, yet a classification failure skipped
it purely for sitting later. Each blocked processor now names the upstream that invalidated it.
