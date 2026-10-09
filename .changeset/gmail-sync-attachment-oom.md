---
'@dxos/plugin-google': patch
---

Gmail sync no longer pulls an oversized attachment into memory. `syncMail` downloaded every attachment in full before looking at its size, holding many multi-megabyte buffers at once and overrunning the 128 MB EDGE isolate ("Worker exceeded memory limit."). Attachments larger than the inline blob cap — which the pipeline discarded after the download anyway — are now skipped before the download, so peak memory no longer scales with attachment size.
