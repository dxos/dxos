# Architecture

Applies to new code across macro components (packages, plugins, workers/services, top-level
subsystems) and to changes in the dependencies between them. Copy this block verbatim and replace
every `{{…}}` slot.

````markdown
## Architecture

### Diagram

| Before                    | After                   |
| ------------------------- | ----------------------- |
| ![before]({{BEFORE_PNG}}) | ![after]({{AFTER_PNG}}) |

<details><summary>Diagram source (plugin-illustrator DSL)</summary>

```text
{{AFTER_DX}}
```

</details>

### Dependency changes

| Edge                | Change     | Why     |
| ------------------- | ---------- | ------- |
| `{{FROM}} → {{TO}}` | {{CHANGE}} | {{WHY}} |

### Design notes

{{NOTES}}
````

| Slot             | Fill with                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{BEFORE_PNG}}` | The rendered base-branch diagram. For entirely new code with no before, write `—` in the Before cell instead of an image.                                                                       |
| `{{AFTER_PNG}}`  | The rendered head diagram.                                                                                                                                                                      |
| `{{AFTER_DX}}`   | The head diagram's `.dx` source, verbatim, so a reviewer can check it against the code and re-render it.                                                                                        |
| `{{FROM}}`       | The depending component: `plugin-foo`, `@dxos/echo-db`, `edge router`.                                                                                                                          |
| `{{TO}}`         | What it depends on.                                                                                                                                                                             |
| `{{CHANGE}}`     | `added` or `removed`.                                                                                                                                                                           |
| `{{WHY}}`        | Why the edge is needed (or why it can go), and `cycle` or `crosses app → sdk → core` when it does either. One row per edge. With no edge added or removed, replace the whole table with `None.` |
| `{{NOTES}}`      | The decisions a reviewer would otherwise ask about, one short paragraph each, or `None.`                                                                                                        |

## Drawing the diagrams

Diagrams are drawn with plugin-illustrator's semantic DSL (`.dx`) and rendered by its CLI. **Never
use Mermaid** — no ` ```mermaid ` block in the body and no `.mmd` source: GitHub would render it with
its own layout, so every PR's diagrams would look different from the illustrator's and from each
other.

1. Follow the `drawing-diagrams` skill to write the `.dx`: derive edges from real imports or
   `package.json` dependencies, not memory; give every node `ref="<repo-relative path>"`.
2. Write `before.dx` and `after.dx` in the scratchpad. Copy `before.dx` to `after.dx` and edit only
   the changed nodes and edges, so the two layouts stay comparable.
3. Mark what changed on the after diagram with these exact labels, and nothing else (the renderer
   ignores `color=`, so a colour-only mark does not show):
   - an added edge: label `"added"` (`edge Plugin -> Echo "added"`);
   - a removed edge stays on the after diagram: `"removed" stroke=dashed`;
   - an added node: append ` (new)` to its label, within the 17-character limit;
   - unchanged edges carry no label.
4. Render both with the illustrator CLI, which writes `<name>.png` and `<name>.dx.svg` beside each
   source and prints a layout report:

   ```bash
   CHROMIUM_PATH=/opt/pw-browsers/chromium moon run plugin-illustrator:render-diagrams -- \
     "$SCRATCH/before.dx" "$SCRATCH/after.dx"
   ```

   Omit `CHROMIUM_PATH` outside the cloud sandbox. A DSL or layout `error` exits 1; fix it before
   going on.

5. `Read` both PNGs and run the look-before-you-submit checklist in `drawing-diagrams` step 4.
6. Attach the PNGs per `hosting-artifacts` (`gh --attach`, R2 as the fallback). Commit the `.dx` only
   when the diagram belongs in the package's docs.
