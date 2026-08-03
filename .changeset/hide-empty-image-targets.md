---
'@dxos/plugin-inbox': patch
---

Hide markdown images with an empty target (`![alt]()`) when image loading is disabled. The match required a non-empty url, so these fell through and rendered as a broken image with their source left visible, alongside the `cid:` and protocol-relative targets already handled.
