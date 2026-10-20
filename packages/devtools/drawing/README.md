# @dxos/drawing

**drawing.sh**: diagrams your coding agent can draw.

The agent writes a few lines of the semantic diagram language (`.dx`) saying which boxes exist and how they
relate; `drawing render` places the boxes on a grid, routes every arrow, reports crossings and bends, and
writes an SVG. The `.dx.svg` embeds its source, so it renders anywhere and stays editable as text.

## Install the skill

```bash
npx skills add dxos/dxos --skill drawing
```

The skill is [`skills/drawing/SKILL.md`](../../../skills/drawing/SKILL.md) at the repository root, where `npx skills`
finds it: the workflow and the language reference. The build copies it into this package's `skills/` so the npm
package ships it too.

## Use the CLI

```bash
DRAWING=https://pkg.pr.new/dxos/dxos/@dxos/drawing@0cc622dceb38943f22df4d9669e86dc55459d95c
npx -y $DRAWING render arch.dx                 # writes arch.dx.svg and prints the layout report
npx -y $DRAWING render - -o docs/arch.dx.svg   # the .dx from stdin
npx -y $DRAWING render arch.dx --plain         # a bare arch.svg
npx -y $DRAWING check arch.dx --json           # the report only
npx -y $DRAWING source arch.dx.svg             # the .dx the SVG carries (-o writes it to a file)
npx -y $DRAWING open arch.dx.svg               # a link that opens it in app.drawing.sh (--print: don't launch)
```

The URL pins one commit, so agents run immutable code rather than the moving `@main`. After a CLI change lands
and pkg.pr.new publishes its merge commit, re-pin the skill and this README with
`bun packages/devtools/drawing/scripts/pin-skill.ts <40-char sha>`. Optionally, from npm, `npm i -g @dxos/drawing`
puts `drawing` on PATH.

Exit code 1 means a source error or a layout defect. From code: `import { render } from '@dxos/drawing'`.

## Open it in app.drawing.sh

`drawing open arch.dx.svg` uploads the diagram's `.dx` source (never the SVG) to app.drawing.sh's share API,
prints a `https://app.drawing.sh/?d=<id>` link and opens it in the browser, where the drawing is an editable
canvas. The id is 128 random bits, so the link is the only way in; it expires 30 days after it was last opened.
`DRAWING_APP_URL` points the command at another drawing app, such as a local `wrangler dev`.

## Open it in Composer

`dx drawing import arch.dx.svg` (the DXOS CLI) adds the drawing to a space, where it is an editable canvas.
A drawing.sh file carries only its source; the importer lays it out again.

## In this package

| Path                 | What                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| `src/`               | `render` and the `drawing` CLI                                        |
| `skills/drawing/`    | Build output: a copy of the root `skills/drawing` skill, for npm      |
| `site/`              | The drawing.sh landing page and live editor (`@dxos/drawing-site`): `moon run site:serve`, `moon run site:deploy` |
| `autocue/`           | The agent-first demo flow (`agent-demo.mjs`) and its sample repo      |
| `docs/launch/`       | Launch post drafts                                                    |
| `DRAWING.mdl`        | Spec and QA                                                           |
