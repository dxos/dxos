---
'@dxos/app-graph': patch
---

A node that leaves the graph and comes back is expanded again. The builder dropped the node's connectors on removal, but the graph still marked its relations expanded, so a returning node kept no children or actions. A presence row lost its Follow, Jump and Go to after the peer visited Settings or another space.
