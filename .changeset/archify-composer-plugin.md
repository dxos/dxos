---
'@dxos/plugin-markdown': minor
---

Add `@dxos/plugin-archify`: Archify system-architecture diagrams in Composer. A new `Diagram` ECHO object stores the typed Archify IR (components, boundaries, connections, guided views, legend cards) structurally, so an agent authors the same document the renderer consumes. A deterministic validator produces machine-readable diagnostics — rule code, subject, evidence, and the IR fields that can clear it — covering schema, placement, grid collisions, component overlap, route clearance through third components, and edge-label clearance; `archify.write` rejects a document with an error-level finding and leaves the stored diagram untouched. The article, card, section and slide surfaces render the IR to SVG in Archify's palette, with authored guided views and click-to-trace reachability. Operations: `archify.create`, `archify.read`, `archify.verify`, `archify.write`, exposed to agents through the Archify skill.
