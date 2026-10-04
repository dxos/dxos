---
'@dxos/agent-runtime': patch
---

Stop an agent waking itself forever on tool results it has already seen: results delivered within their own turn are no longer queued, and every delivered result is pruned from the queue (not just the head) before it is persisted, so a reload no longer replays them one turn at a time.
