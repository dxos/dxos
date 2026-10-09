---
'@dxos/echo': minor
---

Diagram connectors accept `tail=arrow`, so one connector can carry an arrowhead at both ends instead of drawing a two-way relationship as two arrows (`edge A -> B tail=arrow` in the diagram DSL). The layout engine now pulls apart connectors that would otherwise share a line, even when separating them adds a crossing.
