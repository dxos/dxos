---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': minor
---

Redesign Composer URLs as pair chains (`/w/<workspace>/<key>/<id>/…`) resolved by the graph builder via per-extension `urlKey` declarations (replacing the `NavigationPathResolver` capability), and collapse the deck's layout modes into a single mode: presentation derives from plank count, fullscreen is transient, and a new `navigationDefault` setting (with shift-click inversion via `LayoutOperation.Open`'s `disposition`) controls whether navigation replaces the current plank or opens a new one. Breaking: `LayoutOperation.SetLayoutMode` and `AppCapabilities.Layout.mode` are removed (use `variant`/`fullscreen`), and `?plank=` URLs are replaced by the pair-chain grammar.
