---
'@dxos/app-toolkit': minor
'@dxos/plugin-deck': minor
---

Redesign Composer URLs as pair chains (`/w/<workspace>/<key>/<id>/…`) resolved by the graph builder via per-extension `urlKey` declarations (replacing the `NavigationPathResolver` capability), and collapse the deck's layout modes into a single mode: presentation derives from plank count (fullbleed / tiling / sliding) and fullscreen is transient. Navigation is now gesture-based (no `navigationDefault` setting): nav-tree plain click navigates solo (shift adds a plank), and in-plank/card navigation follows the deck — adding beside the origin when sliding and replacing when solo. `LayoutOperation.Open`'s `disposition` values are `solo | add | auto`. Breaking: `LayoutOperation.SetLayoutMode` and `AppCapabilities.Layout.mode` are removed (use `variant`/`fullscreen`), and `?plank=` URLs are replaced by the pair-chain grammar.
