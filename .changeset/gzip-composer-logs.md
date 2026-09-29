---
'@dxos/util': minor
---

`@dxos/util` exports `gzip`, which compresses a string or `Blob` with the platform `CompressionStream`. The
observability support API now uploads feedback logs gzipped (`Content-Type: application/gzip`), and the
debug plugin's "Download logs" button saves a `.ndjson.gz` file.
