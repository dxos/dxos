---
'@dxos/echo': patch
'@dxos/plugin-onboarding': patch
---

Deferred ~1.7 MB of minified JavaScript out of the set a tab loads at startup (measured on a fully activated tab, from 13.7 MB to 12.0 MB). The onboarding hero image is now an asset rather than an inlined base64 module, and emoji-mart, the mermaid grammar, bip39, the AI session runtime, the ML runtime, the EVM client, the welcome screen and the devtools chart panel all load on first use.
