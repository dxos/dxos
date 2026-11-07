---
# multiple-changesets: live cursors on drawings is a feature of its own, apart from the protocol channel in awareness-channel.md
'@dxos/app-toolkit': minor
'@dxos/plugin-tldraw': minor
---

Drawings show collaborators' live mouse cursors, each labelled with the member's name in their presence hue. This covers tldraw sketches and svg architecture diagrams. `Hooks.useAwareness` binds a `@dxos/protocols/Awareness` channel to an object and the local identity; `Hooks.usePointerAwareness` and `Hooks.usePointerCursors` share a `Hooks.Point` in the surface's own coordinates, with a 50 ms throttle, a 5 s heartbeat and a 60 s idle withdraw. `react-ui-attention` adds `RemoteCursor` and `RemoteCursorLayer`, an overlay that places cursors on any surface through a coordinate projection.
