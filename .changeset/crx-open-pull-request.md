---
'@dxos/plugin-github': patch
---

Open a GitHub pull request in Composer from the browser extension: a `plugin-crx` page action on
`github.com/*/*/pull/*` invokes `ImportPullRequestFromSnapshot`, which reads the page's URL and
delegates to the existing import (so a public pull request works with no GitHub connection).

The extension's default Composer hosts are now `preview.composer.space` and `composer.space`.
