---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

`Grid`'s `cols` and `rows` take typed track tokens: `'fill'` (a flexible track that may shrink below its content, `minmax(0, 1fr)`), a number (a share of the free space, also shrinkable), `'min'`/`'max'`/`'auto'` (sized to the content), or a length such as `'18rem'` or `var(--…)`. A count is equal `fill` tracks.

**Breaking:** raw CSS track strings (`'1fr'`, `'min-content'`, `'minmax(0, 1fr)'`) are no longer accepted, and a count or a number now yields shrinkable tracks (`minmax(0, n·fr)`) rather than `n·fr`.

The chat's queued prompts are small, right-aligned rows flush with the status chip, and the prompt takes at most three queued prompts behind a running turn (`maxQueue`).
