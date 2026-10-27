# Reddit

## r/ClaudeAI

**Title:** I made a skill so Claude draws architecture diagrams that don't look like spaghetti

Claude is great at explaining how a codebase fits together and bad at drawing it: Mermaid output
tangles past ten boxes, and hand-written SVG puts arrows through boxes.

drawing.sh is a skill plus a small CLI. Claude writes a few lines describing boxes, groups and
relationships; `drawing render` does the layout (grid placement, orthogonal routing) and prints a
report with crossings and bends. Claude reads the report and fixes its own diagram.

Install: `npx skills add dxos/dxos --skill drawing`, then ask "draw the architecture of this repo".

Site with examples: https://drawing.sh. Feedback very welcome, especially diagrams it gets wrong.

## r/programming

**Title:** drawing.sh: describe a diagram as relationships, get a laid-out SVG

We built a small diagram language where you only say what is related, never where it goes:

```
edge Api -> Db "reads, writes"
edge Customer one-to-many Order
edge Dog extends Animal
```

A layout engine places boxes on a grid and routes arrows through the gutters with the fewest bends,
then reports crossings and overlaps. It was designed for coding agents (it ships as a `SKILL.md`), but
it works fine by hand: `npx -y @dxos/drawing render file.dx`.

The output SVG embeds its own source in a `<metadata>` element, so it renders on GitHub and stays
editable as text. Write-up and examples: https://drawing.sh
