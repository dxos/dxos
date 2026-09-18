---
# multiple-changesets: a layer of stacked PR #13161, whose diff from main includes the entries of the layers below it
'@dxos/network-manager': patch
---

Fix peer connections that stalled or were torn down while connecting or closing: a failed session tells the remote, buffered channel frames keep their order, pending sends are released on close, and rate-limited topology updates run later instead of being dropped.
