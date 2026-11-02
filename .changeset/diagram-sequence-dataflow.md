---
'@dxos/diagram': minor
'@dxos/plugin-illustrator': minor
---

The `.dx` diagram DSL draws sequence diagrams (`diagram kind=sequence`: participants, `calls`/`sends`/`returns` messages with activations, notes and `alt`/`opt`/`loop`/`par`/`break`/`critical` fragments) and data-flow diagrams (`diagram kind=dataflow`: process, store and external roles, with warnings for flows that break the data-flow rules). Mermaid input is deprecated: the `generate` operation and `Mermaid.compile`, `Uml.compile` and `MermaidEngine.compile` still work but are marked deprecated in favour of `draw` and `Dsl.compile`.
