---
'@dxos/eslint-plugin-rules': minor
---

Add the `latin1-source` rule: a character above U+00FF in a comment, string, template, regex or JSX fails lint, because it makes V8 hold the whole module at two bytes per character. `--fix` rewrites comments to ASCII; elsewhere the error names the Latin-1 spelling to write, and the editor suggestion writes ASCII for display text and an escape where code compares, matches or truncates the exact value. `{ loose: true }` suggests ASCII for every symbol, for code outside production. Error messages, logs and UI text across the packages now use ASCII punctuation (`-`, `->`, `...`) in place of typographic characters.
