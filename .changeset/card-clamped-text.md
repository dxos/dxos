---
'@dxos/echo': patch
---

`Card.Text` takes `lines`, and clamped text wraps inside a card row, which otherwise keeps its content to one line. A row of clamped text tops its icon against the first line. A GitHub card's description now shows up to three lines rather than one clipped line.
