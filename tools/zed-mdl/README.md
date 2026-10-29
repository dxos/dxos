# DEUS MDL — Zed extension

Language support for `.mdl` specification files in [Zed](https://zed.dev): highlighting through tree-sitter, and
the features of [`mdl-language-server`](../mdl-language-server/README.md), the same server the VS Code extension
runs — diagnostics, completion, go to definition for `github:` keys and spec references, hover cards, the outline,
and the review's verdicts as inlay hints.

## Install (dev extension)

Zed installs extensions from its registry or, for a dev extension, from a folder. Until this one is in the registry:

1. Install Rust with `rustup` (Zed builds the extension's Wasm with it): <https://rustup.rs>.
2. Get the extension folder: this directory in a dxos checkout, or unpack the release tarball:
   ```bash
   curl -LO https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/demos/2026-10-29-mdl-editor-extensions/zed-mdl-0.1.0.tar.gz
   tar xzf zed-mdl-0.1.0.tar.gz        # -> zed-mdl/
   ```
3. In Zed, run `zed: install dev extension` from the command palette and choose that folder.
4. Open a `.mdl` file. The status bar shows the language as `DEUS MDL`.

To see the review verdicts inline, turn on inlay hints (Zed hides them by default):

```jsonc
// settings.json
{ "inlay_hints": { "enabled": true } }
```

Zed has no code lenses or margin colours, so the verdict chips appear as inlay hints at the end of each reviewed
item's declaration line; Ctrl/⌘-click a `</> symbol` chip to open the code. Hover the line for the full verdict.

## How it works

| Piece                                   | What                                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `languages/mdl`                         | The `DEUS MDL` language for `*.mdl`: Zed's built-in `markdown` grammar, with queries that inject `MDL Block` into ```` ```mdl ```` fences and `Markdown-Inline` into prose. |
| `languages/mdl-block`                   | The hidden `MDL Block` language: the [`tree-sitter-mdl`](../tree-sitter-mdl/README.md) grammar and its highlight queries (a copy of `tree-sitter-mdl/queries/highlights.scm`; `moon run tree-sitter-mdl:test` checks they match). |
| `extension.toml` `[grammars.mdl]`       | Zed builds the grammar from `tools/tree-sitter-mdl` in this repository at the pinned `rev`.                                                                              |
| `src/lib.rs`                            | Starts the language server. It runs, in order: `lsp.mdl-language-server.binary` from your settings, `mdl-language-server` on the PATH, the worktree's own `tools/mdl-language-server/dist/server.cjs` when the worktree is a dxos checkout, and otherwise the bundled server downloaded once from the release URL. Zed's own Node runs the script. |

To run a local build of the server, either open the dxos checkout itself (after `moon run mdl-language-server:bundle`)
or point the setting at it:

```jsonc
{
  "lsp": {
    "mdl-language-server": {
      "binary": { "path": "node", "arguments": ["/path/to/dxos/tools/mdl-language-server/dist/server.cjs", "--stdio"] }
    }
  }
}
```

To try a grammar change before it is pushed, set `[grammars.mdl] repository` to `file:///path/to/dxos` and `rev` to
the commit that holds the change, then reinstall the dev extension.

## Check

```bash
cargo check                                   # the extension compiles natively
rustup target add wasm32-wasip2 && cargo build --release --target wasm32-wasip2
```

## Publishing

To list the extension in Zed's registry, open a PR on
[zed-industries/extensions](https://github.com/zed-industries/extensions) that adds this directory as a submodule
path and an entry in `extensions.toml`; the extension's `repository` must then point at a repository Zed can clone
with the extension at its root, or use the `path` key for a subdirectory.
