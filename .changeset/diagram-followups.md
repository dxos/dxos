---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

Edge labels sit beside their own route and off group frame borders. The semantic DSL gains soft sides (`A:~left`), group shape (`compact`, `max-width=N`, `diagram aspect=W:H`) and fan-in buses (`edge A, B -> C bus`), and warns about a bus it cannot honour or a group frame an outside relation stretches. Diagnostics measure bound arrows as drawn, count a bus as one connector, and no longer count T-junctions or self-loops as crossings. Node labels wrap, shrink or ellipsize to stay inside their box, and re-rendering a source gives a byte-identical `.dx.svg`.
