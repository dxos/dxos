---
'@dxos/ui-editor': minor
'@dxos/plugin-github': minor
---

Walkthroughs: a pull request narrated as ONE markdown document, whose prose, headings and ```diff
fences read as a single narrative.

`diffBlocks()` claims a fence whose info line starts with `diff` and renders it as a diff chunk. The
info line carries the review metadata: ` ```diff file=src/index.ts lines=66-99 lang=typescript `.
Layout is `split`, `inline`, or `auto` (the default), which measures the block and falls back to a
unified column in a narrow pane; code is syntax-highlighted by loading the language lazily.
`walkthroughSidebar()` is a separate extension over the same reading of the document: a rail of
sections with the files each touches and their change counts, with `walkthroughOutline()` exposing
the same data to a host that would rather render its own panel.

This is not `@codemirror/merge`: both of its views take the whole document as one side of one diff,
which cannot express a document that is mostly prose with diffs embedded in it.

`GenerateWalkthrough` produces such a document from a pull request. It fetches the pull request and
its diff, has the model narrate the change in reading order, and stores a `Walkthrough` object
holding the body as a plain string, the commit it was generated against, and a ref to the
`PullRequest`. It is idempotent by commit unless `force` is set, and reports progress under a key
derived from the pull request.

The model never writes diff content: it emits empty fences naming a path and a line range, and a
postprocess splices the real hunks in from the patch, then appends every hunk the prose did not
claim. The artefact therefore always accounts for the whole change even when the model's reading of
it is partial.
