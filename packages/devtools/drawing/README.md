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
npx -y @dxos/drawing render arch.dx          # writes arch.dx.svg and prints the layout report
npx -y @dxos/drawing render arch.dx --plain  # a bare arch.svg
npx -y @dxos/drawing check arch.dx --json    # the report only
npx -y @dxos/drawing source arch.dx.svg      # the .dx the SVG carries
```

`npm i -g @dxos/drawing` puts `drawing` on PATH for faster repeat runs; `@dxos/drawing@next` is the pre-release
build.

Exit code 1 means a source error or a layout defect. From code: `import { render } from '@dxos/drawing'`.

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
