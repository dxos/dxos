# tree-sitter-mdl

A [tree-sitter](https://tree-sitter.github.io) grammar for the body of a DEUS ```` ```mdl ```` fence: the header
line `<type> [<id>] [<label>][: <title>]`, then indented `key[?]: value` fields, `- item` lines, `#` comments and
prose. Zed highlights with it (`tools/zed-mdl`); any tree-sitter editor can.

An external scanner (`src/scanner.c`) classifies each line before it is parsed, since only a look at the whole line
tells a field from prose, and a `key: |` or `key: >` block scalar makes the deeper lines below it prose whatever
they look like.

Values keep their tokens: `github:` keys, `<spec id>#<item>` references, `user:`/`agent:` actors, numbers, `|`,
brackets and commas, and `#` comments after whitespace. `queries/highlights.scm` paints a value's words as types
only where they are type atoms — a one-word value, a union member, a list item — so a capitalised sentence stays
plain.

## Regenerate and test

`src/parser.c` is generated and committed, since Zed builds the grammar from the repository as it is.

```bash
cd tools/tree-sitter-mdl
npx tree-sitter-cli@0.26.13 generate --abi 14   # or: moon run tree-sitter-mdl:generate
npx tree-sitter-cli@0.26.13 test                # the corpus in test/corpus
```

ABI 14 loads in every current Zed. Every ```` ```mdl ```` fence in this repository parses without an error node.
