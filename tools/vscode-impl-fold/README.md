# Impl Fold — VS Code extension

Collapses implementation bodies — functions, methods, constructors, and `const f = () => { ... }` values — so a file
reads as its API: signatures, types, interfaces and class shells stay open.

| Command (palette, category **Impl Fold**)        | Effect                                                         |
| ------------------------------------------------ | -------------------------------------------------------------- |
| Toggle Auto-Collapse of Implementation Bodies    | Turns `implFold.autoCollapse` on or off (also the status item) |
| Collapse All Implementation Bodies               | Collapses every body in the active editor once                 |
| Expand All Implementation Bodies                 | Expands every body in the active editor once                   |

With auto-collapse on, each file is collapsed the first time it is shown, and not again until it is closed, so a body
you expand stays expanded. A body that holds the cursor (e.g. after Go to Definition) is left open.

## JS and TS: parsed in-process

For TypeScript and JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`) the extension parses the file itself with
[oxc-parser](https://oxc.rs), so a cold editor folds in milliseconds instead of waiting for tsserver to load the
project. The `.vsix` carries the native binding for the platform it was built on; on any other platform, or with
`implFold.parser` set to `languageServer`, it uses the language-server path below.

VS Code paints a file before any extension can act on it, so a file's first open still shows it unfolded for a
frame. The extension also remembers each file's bodies (keyed by content hash) and applies them as soon as the
editor activates.

## Other languages: the language server

It asks the language's own providers, through `vscode.executeDocumentSymbolProvider` and
`vscode.executeFoldingRangeProvider`, and folds, for each symbol of a body kind, the widest folding range that starts
on or after the symbol's name and ends where the symbol ends. Any language with a document-symbol provider works;
TypeScript and JavaScript are the tested case. `implFold.bodySymbolKinds` and `implFold.valueSymbolKinds` take
`vscode.SymbolKind` names to tune what counts as a body.

## Install

```bash
moon run vscode-impl-fold:package                                        # -> tools/vscode-impl-fold/dist/vscode-impl-fold.vsix
code --install-extension tools/vscode-impl-fold/dist/vscode-impl-fold.vsix
```

Then run `Developer: Reload Window`.
