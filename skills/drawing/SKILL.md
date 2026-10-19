---
name: drawing
description: Draw architecture, data-flow, class and dependency diagrams as SVG with the `drawing` CLI (drawing.sh, npm package `@dxos/drawing`). You write a short text file saying which boxes exist and how they relate; the CLI places the boxes on a grid, routes every arrow, reports crossings and bends, and writes an SVG. Use when asked to draw, diagram, sketch or visualise a system, a codebase, a request flow, a data model or a pipeline, or to add a diagram to a README, design doc or pull request.
---

# drawing

You describe the diagram; the layout engine draws it. Never compute coordinates, never write SVG by hand,
and never use Mermaid for a diagram this skill can draw.

## Install

Nothing needs installing: when `drawing` is not on PATH, `npx -y @dxos/drawing render diagram.dx` runs it.
`npm i -g @dxos/drawing` is optional and makes repeat runs faster. For a pre-release build, add the `@next`
tag (`npx -y @dxos/drawing@next …`).

## Workflow

1. **Get the facts from the source, not from memory.** For a codebase, read the imports, package
   manifests, service configs or schema files, so every arrow is something you can point to.
2. **Cut it to what a reader needs.** At most about 14 boxes and 3 groups. Drop helpers, tests,
   constants and leaf utilities; when you drop a box that relays an arrow (`A → helper → C`), keep the
   arrow as `A → C`. Split a bigger system into two diagrams.
3. **Write a `.dx` file** (language below) with your file-editing tool, not a shell heredoc. Start with no
   placement hints.
4. **Render it**, as a command of its own (no pipes or chains, so it runs without extra approval):

   ```bash
   drawing render diagram.dx
   ```

   If that reports `command not found`, run `npx -y @dxos/drawing render diagram.dx` instead. Don't
   probe for the command first; just run it. If that fails too (for example npm `ETARGET` or `E404`),
   stop: tell the user the exact error and the install command above. Don't hand-draw an SVG, switch to
   Mermaid or try other package names.

   It prints a report and writes `diagram.dx.svg` beside the source. `--plain` writes a bare `.svg`;
   `-o path` picks the output; `--json` prints the report as JSON. Exit code 1 means the source has an
   error or the layout has an overlap; fix the source and render again.

5. **Look at the result before you show it.** If you can view images, open the SVG. Otherwise read the
   report: `crossings` and `bends` should be low, and every warning names the boxes involved. Fix one
   defect at a time with the smallest hint (below), render again, and stop after about four rounds.
6. **Hand it over.** Reference the SVG by path (`![Architecture](docs/architecture.dx.svg)`), and keep
   the `.dx` next to it so the next change is an edit to text, not a redraw. A `.dx.svg` carries its
   source, so when only the picture is at hand, `drawing source diagram.dx.svg` prints the `.dx` to edit.

## The language

```
diagram flow=down                     # optional; flow=down|up|right|left, aspect=16:9
group web "Web app" {
  node Browser "Browser"
  node Api "API server"
}
group data "Storage" {
  node Db "Postgres"
  node Cache "Redis"
}
node Queue "Queue"
node Worker "Job worker"
edge Browser -> Api "HTTPS"
edge Api -> Db "reads, writes"
edge Api -> Cache
edge Api -> Queue "enqueue"
edge Queue -> Worker
edge Worker -> Db
```

- `node <id> ["label"] [placement…] [ref="path"] [shape=rect|ellipse|diamond|triangle]`: one box. Declare
  every box with `node` before an edge uses it; an edge to an undeclared id is an error. The
  label defaults to the id. Labels are drawn on one line in a fixed-width box, so keep them to about 17
  characters; the id can stay long. Give `ref="<repo-relative path>"` so the diagram can be checked
  against the code.
- `group <id> ["label"] [right-of|left-of|below|above <group>] [compact] [max-width=N] { … }`: a dashed
  frame around its members. Groups do not nest; use three or fewer.
- **A node is in a group only if its `node` line is inside that group's braces.** There is no `group=`
  attribute, and each id and each group is declared once. To move an existing box into a group, cut its
  `node` line and paste it inside the braces; edges refer to ids, so they stay where they are. Writing
  `node Db` again inside the group is a second declaration (`"Db" is already declared`), and a second
  `group data { … }` block is too; add members to the one block. A group needs at least one member.

  Before:

  ```
  node Api "API server"
  node Db "Postgres"
  node Cache "Redis"
  edge Api -> Db
  edge Api -> Cache
  ```

  After, with `Db` and `Cache` moved into a new group:

  ```
  node Api "API server"
  group data "Storage" {
    node Db "Postgres"
    node Cache "Redis"
  }
  edge Api -> Db
  edge Api -> Cache
  ```

- `edge A -> B ["label"]`: an arrow. `<->` draws two arrowheads, `--` none. `edge A -> B, C` fans out.
  Label only the edges that say something, in a few words.
- **Say what an edge means and the arrowhead follows.** Put a word in place of `->`; the left end is
  always the child, the whole, the owner or the "one" side:

  | Statement                          | Draws                                         |
  | ---------------------------------- | --------------------------------------------- |
  | `edge Dog extends Animal`          | hollow triangle at Animal                     |
  | `edge Store implements Readable`   | dashed line, hollow triangle                  |
  | `edge Car composes Engine`         | filled diamond at Car (the parts die with it) |
  | `edge Team owns Player`            | hollow diamond at Team                        |
  | `edge Customer one-to-many Order`  | bar at Customer, crow's foot at Order         |
  | `edge Student many-to-many Course` | crow's feet at both ends                      |
  | `edge App depends-on Logger`       | dashed line, open arrow                       |

- Ids are bare words (`A-z 0-9 _ -`). `diagram`, `group`, `node`, `edge`, `cell`, `via`, `bus` and
  `compact` are reserved; quote them to use them as ids.

### Hints, only to fix something you saw

- Placement: `right-of X`, `left-of X`, `below X`, `above X`, `same-row X`, `same-col X`. These are
  rules; prefix `~` (`~below X`) to make one a preference. Relate groups (`group data below web`)
  rather than members of different groups, or the frames stretch around empty space.
- A long strip: `diagram aspect=16:9`, or `compact` / `max-width=N` on the group that stretched.
- An arrow that wraps around a box: name its sides, `edge A:right -> B:top`, or `A:~right` to only
  prefer one.
- A crowded gutter: `via cell(1.5,_)` routes through the gutter between columns 1 and 2;
  `via cell(_,1.5)` between rows 1 and 2.
- Several arrows from one source: `edge A -> B, C bus` draws one trunk that splits.

If a hint makes the report worse, remove it instead of adding a second one to fight it.

## Opening it as a live drawing

A `.dx.svg` is an ordinary image that GitHub, browsers and docs display. It also carries its source, so
importing it into a [Composer](https://composer.space) space turns it into an editable drawing that people
and agents keep working on together. With the DXOS CLI (`dx`) available, run `dx drawing import
diagram.dx.svg`; `dx drawing list` shows the drawings in the space.
