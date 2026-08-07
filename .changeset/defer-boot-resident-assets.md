---
'@dxos/echo': patch
---

Removed ~2.9 MB of always-resident code from the app's boot graph. The onboarding hero image is now an asset rather than an inlined base64 module, and emoji-mart, the mermaid grammar, bip39, the AI session runtime (MCP SDK, Anthropic client), the ML runtime (transformers, onnxruntime), the EVM client (viem, x402) and the welcome screen all load on first use instead of at startup.
