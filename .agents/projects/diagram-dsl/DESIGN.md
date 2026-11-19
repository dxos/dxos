# Diagram DSL — Design

The specs hold each decision with its reason (`SPEC.mdl` in `@dxos/diagram` and `@dxos/scene`, `PLUGIN.mdl` in
plugin-canvas). This file holds what spans them.

## The rule

An author, a person or an agent, writes structure and never a coordinate. Coordinate text is output only. A drawing
stores records, not its text, so the text is read back out of the records each time it is shown.

## Two levels of one language

| Level  | Statements                          | Written by                  |
| ------ | ----------------------------------- | --------------------------- |
| Intent | `diagram`, `group`, `node`, `edge`  | an author                   |
| Boxes  | `object`, `grid`, `rect`, `arrow` … | the lowering, and the print |

Intent lowers to boxes, and `DSL.printIntent` reads boxes back as intent, checking its answer by lowering it again.
The box form stays as the view of what intent became and as the text of a drawing no grid diagram can say.

## Decisions taken on 2026-11-18 (user:richburdon)

1. The kind `space-graph` is renamed `graph`, with a migration for stored nodes.
2. `.dx` is the only source of the nine slides; the three older generations and their stories go.
3. The deck and its kinds move to plugin-debug as a space template; `graph` stays in plugin-canvas.
4. A box carrying a component is written `custom <id> kind=<name>` in the box form; intent keeps `node`.
5. A node states its own size with `width=` and `height=`, since `size` is a component's own field.
6. #14583 lands first; #14595 stays stacked on it.
