---
'@dxos/agent-runtime': patch
---

Stop an agent waking itself forever on tool results it has already seen: every delivered result is pruned from the queue (not just the head) and the pruned queue is persisted, so a reload no longer replays them one turn at a time.
