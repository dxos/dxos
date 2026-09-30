---
'@dxos/plugin-file': minor
---

File uploads now accept any file type, including files the browser reports with no type (such as `.ndjson.gz` log bundles); a file Composer cannot preview is stored and offered as a download. Types a browser would execute (`text/html`, `application/xhtml+xml`, `text/xml`, `application/xml`) and absent types are stored as `application/octet-stream`.

Breaking: `FileLimits.ACCEPTED_MIME` and `FileLimits.isAcceptedMimeType` are removed; use `FileLimits.toStoredMimeType`.
