---
'@dxos/plugin-sandbox': patch
---

`DownloadFile` now brings a binary file out of the sandbox intact: the bytes are decoded from the service's base64 read and the File's blob carries the detected MIME type, so a downloaded image renders from its blob URL instead of arriving as mangled `text/plain`.
