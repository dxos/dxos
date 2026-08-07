---
'@dxos/echo': patch
---

Removed ~1.2 MB of always-resident code from the app boot graph: the onboarding hero image is now a real asset instead of an inlined base64 module, and emoji-mart, the mermaid grammar, and bip39 load on first use rather than at startup.
