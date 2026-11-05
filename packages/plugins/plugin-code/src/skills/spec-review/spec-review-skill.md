# Spec review

A **review** answers one question for each item of a spec: does the code do what this item says? It is recorded
with `code-create-spec-review { spec, content }`, where `content` is the review written as a `.review.mdl` document.
The spec shows each item's newest verdict beside it, and its Review panel shows the whole review and the ones before.

A review never edits the spec. When the spec is wrong, say so in a verdict's note with status `diverged`.

## The document

Front matter names the commit whose code was read, the date and the reviewer. A paragraph or two of summary follows
the title. Then one `verdict` block per item, its id the item's id: a requirement (`F-3.2`), a type, an operation, a
component, a scenario or a test.

````markdown
---
commit: 04d5fb15a8b5e81ebbabcfc78abdadb969765750
date: 2026-11-05
by: agent:claude-code
---

# Review: CodePlugin

12 items: 7 done, 3 untested, 2 missing. …

```mdl
verdict F-3.2: The toolbar toggles between the spec and its code.
  status: done
  evidence: [github:dxos/dxos/packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.tsx#SpecArticle]
  tests: [github:dxos/dxos/packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx]
```
````

| Status     | Use when                                                             |
| ---------- | -------------------------------------------------------------------- |
| `done`     | The code does what the item says, and a test exercises it.           |
| `untested` | The code does it, but no test exercises it.                          |
| `partial`  | Part is done; the note says which part is not.                       |
| `diverged` | The code does something different; the note says what the code does. |
| `missing`  | Nothing does it; the note says where you looked.                     |

- `evidence` and `tests` are `github:<owner>/<repo>/<path>#<Symbol>` keys naming the declaration that carries the
  behaviour; the viewer opens them on click.
- `walkthrough`, optional, lists up to five `- <sentence>. github:<key>` steps where an item is built in several places.
- `note` explains any status other than `done`.

Recording a review with the same `commit`, `date` and `by` as one already on the spec replaces that review; anything
else adds a new one, so earlier reviews stay as the spec's history.
