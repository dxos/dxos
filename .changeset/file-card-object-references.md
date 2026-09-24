---
'@dxos/plugin-file': patch
'@dxos/echo': patch
---

A `File`'s card shows the image or video it holds (a chat embed, a link preview), instead of a form of its properties. The assistant is told how to link (`[name](echo://…)`) and embed (`![name](echo://…)`) an object, with its URI in full; a block reference chip reads the object's name.
