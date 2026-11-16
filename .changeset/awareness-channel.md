---
'@dxos/protocols': minor
---

Add `@dxos/protocols/Awareness`, a gossip channel that shares a small, frequently changing value about an object (a caret, a pointer, a cell selection) with the other clients in its space. The surface defines the value's schema in its own coordinates; the channel throttles posts, re-announces state for late joiners and drops sessions that leave or stop answering. The editor's `SpaceAwarenessProvider` now runs on it and keeps its wire format, so text cursors work between old and new clients, and its posts now carry the member's `hue`.
