# DEUS MDL — VS Code syntax highlighting

Highlights `.mdl` specification files and the ```` ```mdl ```` fenced blocks inside them (and inside
ordinary markdown). Grammar only — no activation code, no commands.

## How it works

A `.mdl` file is markdown, so the file grammar (`text.html.markdown.mdl`) does nothing but include
the builtin one. The interesting part is a **grammar injection**: rather than forking VS Code's
markdown grammar to teach it one more fence language, `markdown.mdl.codeblock` is injected into
`text.html.markdown` and matches only the ```` ```mdl ```` fence, handing the body to
`source.mdl-block`.

That is the technique from
[mjbvz/vscode-fenced-code-block-grammar-injection-example](https://github.com/mjbvz/vscode-fenced-code-block-grammar-injection-example),
with one difference: that example forwards the block to an existing language (`source.js`), while an
MDL block has its own syntax, so `source.mdl-block` is defined here too.

Because the injection targets markdown generally, an `mdl` fence highlights in any `.md` file —
which is what `docs/DESIGN.md` and the skills need.

## What it colours

| Scope | What |
| --- | --- |
| `keyword.control.block.mdl` | the block type on the first body line (`flow`, `op`, `type`, `ext`, …) |
| `entity.name.type.mdl` | a block id (`QA-1`) or a nested one (`req F-1.1:`) |
| `entity.name.section.mdl` | the title after the colon |
| `variable.other.property.mdl` | field names (`given`, `invoke`, `expect`) |
| `support.type.primitive.mdl` | the dialect's primitive types (`Prose`, `StepList`, `NSID`, …) |
| `support.constant.reference.mdl` | DXNs and dotted URIs (`org.dxos.operation.markdown.create`) |
| `variable.other.capture.mdl` | `$capture` references |
| `comment.line.number-sign.mdl` | `#` comments, whole-line or trailing |

The token set mirrors the CodeMirror extension in
[`packages/reflect/deus/src/extension/fences.ts`](../../../packages/reflect/deus/src/extension/fences.ts),
so the two editors agree on what is worth distinguishing.

## Build and install

```bash
pnpm --filter vscode-mdl build          # -> dist/vscode-mdl.vsix
code --install-extension tools/vscode/vscode-mdl/dist/vscode-mdl.vsix
```

Then reload VS Code (`Developer: Reload Window`) and open any `PLUGIN.mdl`.

`vsce` runs via `npx` rather than as a devDependency: the workspace-installed copy hoists a
minimatch whose default export it cannot call (`(0, minimatch_1.default) is not a function`).

## Developing

```bash
code --extensionDevelopmentPath=$(pwd)/tools/vscode/vscode-mdl
```

Open any `PLUGIN.mdl`. `Developer: Inspect Editor Tokens and Scopes` shows the scope under the
cursor — the fastest way to see whether a rule matched.
