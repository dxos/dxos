---
'@dxos/echo': minor
---

The pull request review composer now floats at the diff line it addresses instead of rendering as a
band under the header, so a line comment is written against the code it is about.

`diffBlocks`' `onLineComment` callback receives the line's comment button as a second argument,
giving a consumer an element to position UI at; existing callbacks that ignore it are unaffected.
