# Bluesky thread

**1/4**
Your coding agent can explain a system. It can't draw one: arrows through boxes, Mermaid spaghetti.

drawing.sh fixes the split: the agent says what connects to what, a layout engine decides where it goes.

npx skills add dxos/dxos --skill drawing
https://drawing.sh

[attach: demo video]

**2/4**
The agent writes a few lines:

edge Browser -> Api "HTTPS"
edge Api -> Db "reads, writes"

`drawing render` places boxes on a grid, routes arrows through the gutters, and reports crossings so
the agent can fix them itself.

[attach: hero diagram]

**3/4**
Say what an edge means and the arrowhead follows: `Dog extends Animal`, `Team owns Player`,
`Customer one-to-many Order`. No coordinates anywhere.

[attach: relationships grid]

**4/4**
The SVG renders on GitHub like any image and carries its own source, so the next change is a diff.
Import it into Composer and it's a live canvas you and your agents keep editing.

Built by @dxos.org on the layout engine inside Composer.
