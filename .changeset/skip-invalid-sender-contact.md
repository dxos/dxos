---
'@dxos/pipeline-email': patch
'@dxos/echo': patch
---

An email address may contain an apostrophe, and mail sync logs a sender that cannot become a contact and keeps syncing instead of failing the run.
