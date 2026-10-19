---
'@dxos/drawing': minor
---

Add `drawing open <file.dx | file.dx.svg>`, which uploads the diagram's source and prints a link that opens it as an editable canvas in app.drawing.sh. `drawing render` reads the `.dx` from stdin with `-`, `drawing source` writes to a file with `-o`, and the skill keeps the `.dx` out of the user's project.
