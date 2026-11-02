# DEUS MDL — VS Code extension

Language support for `.mdl` specification files: highlighting of the file and its ```` ```mdl ```` fences
(also inside ordinary markdown), and the features of
[`mdl-language-server`](../mdl-language-server/README.md), which the extension bundles:

- **Review verdicts**: each item the spec's `<SPEC>.review.mdl` judges gets the spec viewer's chips as code
  lenses — status (✓ Done, ? Untested, ◐ Partial, ≠ Diverged, ✗ Missing), `</> symbol` chips that open the
  code and tests the verdict cites, and `no code` / `tested` / `not tested` — and a coloured line in the margin
  and the overview ruler. Hover the declaration line for the verdict's note, walkthrough and code.
- **Links**: `github:` keys, `<spec id>#<item>` references, `uses`/`dependsOn` ids and relative markdown links
  are clickable, and Go to Definition (F12) opens the file at the symbol or the spec at the item.
- **Hovers**: a key shows the declaration it names; a spec reference shows the other spec's block.
- **Diagnostics**: the deus lint, keys whose file or symbol is gone, and review verdicts for unknown items.
- **Completion**: block types, field names, spec ids after `uses`, items after `<id>#`, verdict statuses.
- **Outline**: headings, blocks and their `req` items.

## Install

Download the `.vsix` and install it (Cursor and other VS Code forks take the same file):

```bash
code --install-extension vscode-mdl-0.2.0.vsix
```

Or build it from this checkout:

```bash
moon run vscode-mdl:package                                   # -> tools/vscode-mdl/dist/vscode-mdl.vsix
code --install-extension tools/vscode-mdl/dist/vscode-mdl.vsix
```

`package` bundles the client (`dist/extension.cjs`) and the server (`dist/server.cjs`) first, then packages
from a staging copy whose manifest has no dependency fields, since vsce cannot read the workspace's
`catalog:` versions.

Then reload VS Code (`Developer: Reload Window`) and open any `PLUGIN.mdl`. To try a change without
installing, run `moon run vscode-mdl:bundle` and launch an Extension Development Host:

```bash
code --extensionDevelopmentPath=$(pwd)/tools/vscode-mdl
```

`Developer: Inspect Editor Tokens and Scopes` shows the scope under the cursor — the fastest way to see
whether a rule matched.

## Settings

| Setting                 | Default | What                                                                                     |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `mdl.review.codeLens`   | `true`  | The verdict chips as code lenses above each reviewed item.                               |
| `mdl.review.inlayHints` | `false` | The same chips as inlay hints at the end of the line.                                    |
| `mdl.review.gutter`     | `true`  | Colour each reviewed line in the margin and overview ruler by its verdict.               |
| `mdl.server.path`       | `""`    | Run this server script instead of the bundled one, e.g. a local `dist/server.cjs` build. |
| `mdl.trace.server`      | `off`   | Log the LSP traffic to the "DEUS MDL" output channel.                                    |

`MDL: Restart Language Server` restarts the server, e.g. after a branch switch.

## How it works

A `.mdl` file is markdown, so the file grammar (`text.html.markdown.mdl`) only includes the builtin one,
which already embeds YAML frontmatter. The `mdl` fences come from a **grammar injection**:
`markdown.mdl.codeblock` is injected into `text.html.markdown` and matches only the ```` ```mdl ````
(or `~~~mdl`) fence, handing the body to `source.mdl-block`. Because the injection targets markdown
generally, an `mdl` fence highlights in any `.md` file too.

Inside a block, the first line is the header `<type> [<id>][: <title>]`; the header rule runs to the
closing fence, so no later line is read as a header. A field value made only of type atoms joined by
`|` is a type expression; any other value is prose, so capitalised words in a sentence are not painted
as types. `key: |` opens a block scalar whose deeper-indented lines are prose, never fields.

The token set mirrors the CodeMirror extension in
[`packages/reflect/deus/src/extension/`](../../packages/reflect/deus/src/extension/) (`fences.ts`,
`constants.ts`), so the two editors agree on what is worth distinguishing.

## Scopes

| Scope | What |
| --- | --- |
| `keyword.control.block.<type>.mdl` | a known block type (`ext`, `type`, `op`, `feat`, `scenario`, `test`, `component`, `service`, `db`, `module`, `suite`, `decision`) |
| `entity.name.type.block.mdl` | any other block type (`rule`, `diagram-rule`, …) |
| `entity.name.function.id.mdl` | a block id (`QA-1`) or a nested one (`req F-1.1:`) |
| `entity.name.section.title.mdl` | the title after the colon |
| `variable.other.property.mdl`, `keyword.operator.optional.mdl` | field keys and their `?` |
| `entity.name.type.mdl`, `support.type.primitive.mdl` | type names, and the dialects' primitives (`Prose`, `RefList`, …) |
| `constant.other.literal.mdl` | lower-case union members (`warn \| error`) |
| `keyword.operator.union.mdl` | `\|` |
| `punctuation.definition.list.*.mdl`, `variable.other.reference.mdl` | `[A, B]` lists and `[F-1.2]` cross-references |
| `storage.type.reference.{op,type}.mdl` | the `op:` / `type:` of a reference |
| `support.class.actor.user.mdl`, `support.function.actor.agent.mdl` | the `user:` / `agent:` of a decision's actor |
| `keyword.operator.block-scalar.mdl`, `meta.block-scalar.mdl` | `key: \|` and its body |
| `support.constant.reference.mdl` | DXNs and dotted NSIDs (`org.dxos.operation.thread.create`) |
| `variable.other.capture.mdl` | `$capture` references |
| `comment.line.number-sign.mdl` | `#` comments, whole-line or after whitespace |

### Block-type colours

Themes colour by scope category, so every block type gets the same keyword colour and `user:` and
`agent:` often look alike. To get the CodeMirror palette, add this to your settings (`src/palette.ts` is
the source):

```jsonc
"editor.tokenColorCustomizations": {
  "textMateRules": [
    { "scope": "keyword.control.block.ext.mdl", "settings": { "foreground": "#a78bfa", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.type.mdl", "settings": { "foreground": "#60a5fa", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.op.mdl", "settings": { "foreground": "#fb923c", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.feat.mdl", "settings": { "foreground": "#34d399", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.scenario.mdl", "settings": { "foreground": "#22d3ee", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.test.mdl", "settings": { "foreground": "#2dd4bf", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.component.mdl", "settings": { "foreground": "#f472b6", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.service.mdl", "settings": { "foreground": "#facc15", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.db.mdl", "settings": { "foreground": "#f87171", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.module.mdl", "settings": { "foreground": "#818cf8", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.suite.mdl", "settings": { "foreground": "#a3e635", "fontStyle": "bold" } },
    { "scope": "keyword.control.block.decision.mdl", "settings": { "foreground": "#fbbf24", "fontStyle": "bold" } },
    { "scope": ["support.class.actor.user.mdl", "string.unquoted.actor.user.mdl"], "settings": { "foreground": "#34d399" } },
    { "scope": ["support.function.actor.agent.mdl", "string.unquoted.actor.agent.mdl"], "settings": { "foreground": "#c084fc" } }
  ]
}
```

## Editing

`language-configuration.json` (the `.mdl` file) uses `<!-- -->` for comments, since `#` starts a markdown
heading, and folds on fences, `<!-- #region -->` markers and indentation. Inside a fence the
`mdl-block` configuration applies instead: `#` line comments, indentation folding, and an indent after
a header or a `key:` line.

Heading folding, the outline and the preview belong to VS Code's markdown extension, which serves only
the `markdown` language. For those, map the files to markdown — the fences still highlight, since the
injection targets markdown:

```jsonc
"files.associations": { "*.mdl": "markdown" }
```

## Tests

```bash
moon run vscode-mdl:test
```

The language features are tested in `tools/mdl-language-server`; this package tests the grammars.

`src/grammar.test.ts` loads the grammars the way VS Code does (`vscode-textmate` + oniguruma, with the
markdown and YAML grammars from `tm-grammars`) and checks two things: targeted assertions per construct,
and a snapshot of every token in each `src/__fixtures__/*.mdl` (copies of real specs plus
`edge-cases.mdl`). After an intended grammar change, review and update the snapshots with
`moon run vscode-mdl:test -- -u`.

`scripts/render.ts` renders a file to HTML through shiki with the same grammars and the palette above:

```bash
node --experimental-strip-types tools/vscode-mdl/scripts/render.ts <file.mdl> <out.html>
```
