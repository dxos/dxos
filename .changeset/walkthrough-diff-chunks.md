---
'@dxos/echo': minor
---

Render ```diff fenced blocks as side-by-side diff chunks inside an ordinary markdown document, so a
walkthrough can interleave prose, headings and diagrams with the changes it narrates.

`diffBlocks()` claims a fence whose info line starts with `diff` and replaces it with a block widget.
The info line carries the review metadata: ` ```diff file=src/index.ts lines=66-99 lang=typescript `.
Layout is `split`, `inline`, or `auto` (the default), which measures the block and falls back to a
unified column in a narrow pane. Code is syntax-highlighted by loading the language lazily.

`walkthroughSidebar()` is a separate extension: a navigation rail listing each section with the files
it touches and their change counts, marking the section under the reader's eye. `walkthroughOutline()`
exposes the same reading of the document to a host that would rather render its own panel.

This is not `@codemirror/merge`: both of its views take the whole document as one side of one diff,
which cannot express a document that is mostly prose with diffs embedded in it.
