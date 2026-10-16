# Your coding agent can draw now

_Draft for blog.dxos.org. Images: the hero diagram with its source, the relationships grid, the demo
video._

Ask a coding agent how your system fits together and you get a good answer in prose. Ask it to draw
that answer and things fall apart. Mermaid output turns into a tangle past ten boxes. Hand-written SVG
puts arrows through boxes and labels on top of each other. The agent knows the structure; it just has
no way to see the picture it is making.

Today we're releasing **drawing.sh**, a skill and a small command-line tool that split that job in two.
The agent says what connects to what. A layout engine decides where everything goes.

## What the agent writes

The agent writes a `.dx` file. It names boxes, groups them, and says how they relate:

```
group web "Web app" {
  node Browser
  node Api "API server"
}
group data "Storage" {
  node Db "Postgres"
  node Cache "Redis"
}
edge Browser -> Api "HTTPS"
edge Api -> Db "reads, writes"
edge Api -> Cache
```

There are no coordinates, sizes or colours to get wrong. Then it runs:

```
npx -y @dxos/drawing render arch.dx
```

## What the engine does

The engine puts every box on a grid. It routes each arrow through the gutters between boxes, choosing
the sides and the route with the fewest bends, and spreads ports so arrows don't stack on top of each
other. Labels go beside their own arrow.

Then it reports what it produced: how many boxes and arrows, how many crossings and bends, and a
warning for each defect, naming the boxes involved. That report is the part we care about most. An
agent can't look at a picture the way you do, but it can read "Connectors Api→Cache and Worker→Db
cross", add one hint (`group data below web`, or `compact` on a group that came out as a strip),
and render again.

The hints are deliberately few: placement relations (`right-of`, `below`, `same-row`), which side an
arrow leaves from, a waypoint through a named gutter. The skill tells the agent to start with none and
add the smallest hint that fixes a defect it can see, because every hint narrows the search and a
"just in case" hint usually makes the layout worse.

## Say what an edge means

Most diagram tools make you pick arrowheads. drawing asks what the relationship is:

- `edge Dog extends Animal` draws a hollow triangle at Animal.
- `edge Team owns Player` draws a hollow diamond at Team.
- `edge Car composes Engine` draws a filled one: the engine dies with the car.
- `edge Customer one-to-many Order` draws a bar and a crow's foot.
- `edge App depends-on Logger` draws a dashed line with an open arrow.

This is easier for agents to get right, because they already think in these terms when they read code,
and the result is a diagram whose markers mean something.

## The SVG is the drawing

`drawing render` writes a `.dx.svg`. It's a plain SVG, so GitHub, browsers and docs render it like any
other image. It also carries its source in a `<metadata>` element. Change one line of the `.dx`,
render again, and the layout re-flows; the diff in your pull request is a line of text, not a
re-exported image.

That file is also how a diagram leaves the terminal. The same engine runs inside
[Composer](https://composer.space), our local-first workspace, where drawings are live objects that
people and agents edit together. Import a `.dx.svg` into a space (`dx drawing import`) and it becomes a
canvas your team can keep working on.

## Install it

drawing installs as a standard `SKILL.md`, so it works in Claude Code, Cursor, Codex and any agent that
reads skills:

```
npx skills add dxos/dxos --skill drawing
```

Then ask your agent something like _"draw how a request moves through this service"_ and look at what
comes back.

## What it isn't (yet)

drawing is good at boxes-and-arrows diagrams up to about fifteen boxes and three groups. Past that,
crossings climb, and the skill tells the agent to split the diagram rather than draw a bad one. It
doesn't do sequence diagrams, and the label width is fixed, so long names need a short label.

We'd love to see the diagrams it gets wrong. Open an issue on
[GitHub](https://github.com/dxos/dxos/issues) with the `.dx` file and we'll look at the layout.
