# Usability probe: going deep (2026-10-16 20:50 UTC)

A Haiku agent, briefed as a developer deciding whether to adopt the language, made fifteen visits through
definitions, spec documents, search, the task board and the history of `@dxos/toolchain`.

## What it found working

Requirements name their evidence one click away; change pages show the diff and the rehashed dependents;
task pages show state, priority, labels and comments; spec prose explains intent.

## What it found wrong, and what changed

| Finding                                                                              | Change                                                                                                                                   |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Search did nothing it could use                                                      | `#q:<text>` opens the finder on a query, so a search can be linked; the finder itself works but is an overlay its text dump did not show |
| The explorer task listed three subtasks four times each                              | Nine duplicate tasks are canceled; a task card counts canceled subtasks instead of listing them                                          |
| `Codebase.Spec` printed ``[`deus/codebase.deus`](…)`` as raw Markdown                | A link whose label is code is one piece, linked to the file on GitHub                                                                    |
| History's `~26 −270 +1` had no legend                                                | Each count has a title, and the glossary explains them                                                                                   |
| "Spec documents 28" beside "S 335 specs"                                             | The kind is labelled spec blocks                                                                                                         |
| Comments cite deploys, timeline stages and #13952 without links; card bodies cut off | Not changed: its tool shows the first 8,000 characters                                                                                   |
