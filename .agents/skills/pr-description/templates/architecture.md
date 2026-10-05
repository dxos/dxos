# Architecture

Applies to new code across macro components (packages, plugins, workers/services, top-level
subsystems) and to changes in the dependencies between them.

```markdown
## Architecture

### Diagram

<For a change to existing structure: a "Before" and an "After" diagram, side by side or one after the
other, same node names and layout so the difference is the only thing that moves.
For new code: one diagram of the new components and what they connect to.>

![Before](url) ![After](url)

### New dependencies between components

<Every edge this PR adds or removes between macro components, one per line:
`plugin-foo → @dxos/echo-db (new)`, `edge router → hub-service (removed)`. Say why each new edge is
needed and whether it creates a cycle or crosses a layer boundary (app → sdk → core). "None" is a
valid answer and still gets written.>

### Design notes

<Optional. The decisions a reviewer would otherwise ask about, one short paragraph each.>
```

## Drawing the diagrams

- Use the `drawing-diagrams` skill: a `.mmd` source rendered to SVG by plugin-illustrator's engine,
  then rasterized to PNG. Derive the edges from real imports or `package.json` dependencies, not
  memory.
- For before/after, render the base branch's graph and the head's graph from the same `.mmd` with
  the changed nodes and edges edited, so layout stays comparable.
- Highlight the new or changed edges with an edge label (`-->|new|`) so they stand out without a
  legend.
- Attach the PNGs per `hosting-artifacts` (`gh --attach`, R2 as the fallback). Commit the `.mmd` only when the diagram
  belongs in the package's docs.
