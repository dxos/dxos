---
'@dxos/extractor-lib': patch
'@dxos/pipeline-email': patch
'@dxos/echo': patch
---

An email address may contain an apostrophe, and a sender that cannot become a contact is logged and skipped instead of failing the mail sync run.
