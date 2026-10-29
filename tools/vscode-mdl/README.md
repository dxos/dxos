# DEUS MDL — VS Code syntax highlighting

Highlights `.mdl` specification files and the ```` ```mdl ```` fenced blocks inside them (and inside
ordinary markdown). Declarative only: grammars and language configuration, no activation code, no
language server.

## Install locally

```bash
moon run vscode-mdl:package                                   # -> tools/vscode-mdl/dist/vscode-mdl.vsix
code --install-extension tools/vscode-mdl/dist/vscode-mdl.vsix
```

Then reload VS Code (`Developer: Reload Window`) and open any `PLUGIN.mdl`. Cursor and other VS Code
forks take the same `.vsix` (`cursor --install-extension …`).

To try a change without installing, launch an Extension Development Host:

```bash
code --extensionDevelopmentPath=$(pwd)/tools/vscode-mdl
```

`Developer: Inspect Editor Tokens and Scopes` shows the scope under the cursor — the fastest way to see
whether a rule matched.

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

`src/grammar.test.ts` loads the grammars the way VS Code does (`vscode-textmate` + oniguruma, with the
markdown and YAML grammars from `tm-grammars`) and checks two things: targeted assertions per construct,
and a snapshot of every token in each `src/__fixtures__/*.mdl` (copies of real specs plus
`edge-cases.mdl`). After an intended grammar change, review and update the snapshots with
`moon run vscode-mdl:test -- -u`.

`scripts/render.ts` renders a file to HTML through shiki with the same grammars and the palette above:

```bash
node --experimental-strip-types tools/vscode-mdl/scripts/render.ts <file.mdl> <out.html>
```
