---
'@dxos/plugin-github': minor
---

Generate a walkthrough of a pull request: one markdown document narrating the change in reading
order, with its diff chunks spliced in from the patch itself.

Adds a `Walkthrough` type holding the document as a plain string (it is replaced wholesale on every
regeneration and never co-edited, so a text object's CRDT would be pure cost), the commit it was
generated against, and a ref to the `PullRequest` it describes. `GenerateWalkthrough` fetches the
pull request and its diff, has Sonnet narrate it, fills the chunks, and reports progress under a key
derived from the pull request. It is idempotent by commit unless `force` is set.

The model never writes diff content. It emits empty fences naming a path and a line range, and a
postprocess splices the real hunks in, then appends every hunk the prose did not claim under an
"Also changed" heading — so the artefact always accounts for the whole change even when the model's
reading of it is partial.
