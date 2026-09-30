---
'@dxos/plugin-github': patch
---

Approving a pull request now falls back to a marked conversation comment where GitHub refuses the review — the author's own pull request, or a token without review permission — so the verdict is recorded and an agent can detect that the pull request is good to land.
