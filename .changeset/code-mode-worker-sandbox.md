---
'@dxos/plugin-assistant': patch
---

The `codeModeTurnProducer` plugin option is now a factory that receives the app's capability manager, so a host can build its code-mode sandbox from app services such as the client. Composer uses this to run code mode in a Web Worker on its own ECHO client instead of in the page.
