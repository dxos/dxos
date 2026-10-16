# Show HN

**Title:** Show HN: drawing.sh – a skill that lets coding agents draw architecture diagrams

**URL:** https://drawing.sh

**First comment (post right after submitting):**

Hi HN. We kept asking coding agents to explain systems with a diagram and getting either Mermaid that
renders as a tangle or hand-placed SVG with arrows through boxes. Agents are good at saying what
connects to what. They are bad at deciding where things go.

drawing.sh splits that job. The agent writes a few lines of text:

```
group web "Web app" {
  node Browser
  node Api "API server"
}
node Db "Postgres"
edge Browser -> Api "HTTPS"
edge Api -> Db "reads, writes"
```

and `drawing render` places the boxes on a grid, routes each arrow through the gutters with the fewest
bends, and prints a report (crossings, bends, overlaps) the agent can read and act on. If the report
says two arrows cross, the agent adds a one-word hint (`below`, `right-of`, `compact`) and renders
again.

A few details that might interest people here:

- Relationships carry meaning, not markers: `Dog extends Animal`, `Team owns Player`,
  `Customer one-to-many Order` pick the UML/ER arrowheads for you.
- The output is a plain SVG that GitHub renders. The `.dx.svg` variant also embeds the source in a
  `<metadata>` element, so the next edit is a text diff, not a redraw.
- It installs as a standard `SKILL.md`, so it works in Claude Code, Cursor, Codex and anything else
  that reads skills: `npx skills add dxos/dxos --skill drawing`.
- The layout engine is the one inside Composer, our local-first workspace. Import a drawing into
  a space and it becomes a live canvas that people and agents edit together.

It is early. Layouts with more than ~15 boxes get worse quickly, and we would rather the tool tell you
to split a diagram than draw a bad one. Happy to answer questions about the layout engine.
