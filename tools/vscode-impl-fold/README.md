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

## How it stays language-agnostic

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
