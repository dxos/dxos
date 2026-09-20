# plugin-canvas — Design

Status: phase 0 (audit + design in progress). The validated spec will be written here and mirrored to
`agents/superpowers/specs/2026-09-20-infinite-canvas-design.md`.

## Decisions so far (from the kickoff Q&A, 2026-09-20)

1. Depth = strict containment: an object's children are the next depth (Muse boards-in-boards).
2. Hierarchy is a grouping, not a coordinate transform: each scene has its own local coordinate space.
3. v1 object kinds: frames/groups, text, ECHO object cards (Surface), links/edges. Freehand shapes later.
4. Persistence: a Scene is an ECHO object; its cells are values held in a map inside the scene (not ECHO objects);
   cells may reference ECHO objects (incl. child scenes). Scenes are hierarchical.
5. Build vs adopt: rewrite vs xyflow; react-ui-canvas may be retrofitted later; react-ui-canvas-editor is a first consumer.
6. Rendering: hybrid SVG/canvas + HTML islands (tldraw-style); root layer TBD by the audit; evaluate d3 for splines/routing.
7. First PR: infinite zoomable canvas with grid + palette (rectangle, link, scene). Full interaction set designed now.
