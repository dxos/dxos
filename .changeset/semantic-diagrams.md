---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

The diagram DSL gains a semantic layer: `diagram`, `group`, `node` and `edge` statements describe what is related and roughly where, and `Dsl.compile` places and routes the rest. Constraints range from loose to exact — `right-of`, `above`, `same-row` (soft with `~`), grid cells, absolute positions, port sides, `via` waypoints and shared `bus` channels — so a model can write a good-looking diagram directly, without a helper script.

Edges name UML and ER relationships — `extends`, `implements`, `composes`, `owns`, `depends-on`, `one-to-many`, `many-to-many` — and the renderer draws their line endings (hollow triangle, filled and hollow diamond, crow's foot, dashed lines). Mermaid class and ER diagrams carry the same relations through. The illustrator's Constraints story shows each diagram beside its DSL and scores.
