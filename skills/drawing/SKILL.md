---
name: drawing
description: Draw architecture, data-flow, class and dependency diagrams as SVG with the `drawing` CLI (drawing.sh, npm package `@dxos/drawing`). You write a short text file saying which boxes exist and how they relate; the CLI places the boxes on a grid, routes every arrow, reports crossings and bends, and writes an SVG. Use when asked to draw, diagram, sketch or visualise a system, a codebase, a request flow, a data model or a pipeline, or to add a diagram to a README, design doc or pull request.
---

# drawing

You describe the diagram; the layout engine draws it. Never compute coordinates, never write SVG by hand,
and never use Mermaid for a diagram this skill can draw.

## Install

Nothing needs installing: when `drawing` is not on PATH,
`npx -y https://pkg.pr.new/dxos/dxos/@dxos/drawing@0cc622dceb38943f22df4d9669e86dc55459d95c render diagram.dx` runs the CLI from one pinned commit, so the code never changes under you; use this
form. An npm install (`npm i -g @dxos/drawing`) is an optional alternative, only if the user asks for it. If the skill was installed with `npx skills add`, that left `skills-lock.json`, `.agents/` and `.claude/`
untracked in the repo; tell the user once, so they can commit or ignore them.

## Workflow

1. **Get the facts from the source, not from memory.** For a codebase, read the imports, package
   manifests, service configs or schema files, so every arrow is something you can point to.
2. **Cut it to what a reader needs.** At most about 14 boxes and 3 groups. Drop helpers, tests,
   constants and leaf utilities; when you drop a box that relays an arrow (`A → helper → C`), keep the
   arrow as `A → C`. Split a bigger system into two diagrams.
3. **Write the `.dx` in a scratch location outside the repo** (`$TMPDIR` or `/tmp`), with your file-editing
   tool, not a shell heredoc. Start with no placement hints. The user keeps only the `.dx.svg`, which embeds
   the source; never leave a `.dx` in their project.
4. **Render it** to where the picture belongs, as a command of its own (no pipes or chains, so it runs
   without extra approval):

   ```bash
   drawing render /tmp/arch.dx -o docs/arch.dx.svg
   ```

   If that reports `command not found`, run
   `npx -y https://pkg.pr.new/dxos/dxos/@dxos/drawing@0cc622dceb38943f22df4d9669e86dc55459d95c render /tmp/arch.dx -o docs/arch.dx.svg` instead. Don't probe for
   the command first; just run it. If that fails too (for example npm `ETARGET` or `E404`), stop: tell
   the user the exact error and the commands under Install. Don't hand-draw an SVG, switch to Mermaid or
   guess other package names.

   It prints a report and writes the `.dx.svg` (without `-o`, beside the source). `--plain` writes a bare
   `.svg`; `--json` prints the report as JSON; `-` as the input reads the `.dx` from stdin. Exit code 1
   means the source has an error or the layout has an overlap; fix the source and render again.

5. **Look at the result before you show it.** If you can view images, open the SVG. Otherwise read the
   report: `crossings` and `bends` should be low, and every warning names the boxes involved. Fix one
   defect at a time with the smallest hint (below), render again, and stop after about four rounds. The
   report is for you to fix the layout; don't repeat its numbers to the user.
6. **Hand it over.** Reference the SVG by path (`![Architecture](docs/arch.dx.svg)`), and offer to open it
   in app.drawing.sh (below).
7. **To revise it**, recover the source into scratch, edit that, and render over the same file:
   `drawing source docs/arch.dx.svg -o /tmp/arch.dx`.

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

## Opening it in app.drawing.sh

When the user wants to see or edit the diagram on a canvas, run `drawing open docs/arch.dx.svg` (the same
`npx -y https://pkg.pr.new/dxos/dxos/@dxos/drawing@0cc622dceb38943f22df4d9669e86dc55459d95c open …` form when `drawing` is not on PATH). It
uploads the source, prints a link and opens it in the browser. Give the user the link, and say that anyone
with it can open the diagram and that it expires 30 days after it was last opened. Only `open` uploads;
`render` never does.

A `.dx.svg` is also an ordinary image that GitHub, browsers and docs display. With the DXOS CLI (`dx`),
`dx drawing import docs/arch.dx.svg` adds it to a [Composer](https://composer.space) space as an editable
drawing.
