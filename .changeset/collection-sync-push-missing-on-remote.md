---
'@dxos/echo-host': patch
---

Push documents the sync server is missing. A document that exists only locally had no push lever
under Subduction — collection sync only ever pulled — so the pair stayed permanently
`missingOnRemote`, everything written after it was absent from the remote's query index, and queries
answered "not found" for data the peer was holding. Non-convergence is now reported at `error` level
once a pair has made no progress for ~15 minutes, with per-document heads and handle states for the
undelivered documents as well as the diverged ones.
