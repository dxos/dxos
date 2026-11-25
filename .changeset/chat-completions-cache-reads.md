---
'@dxos/ai': patch
---

Chat-completions models (DeepSeek, OpenAI-compatible servers) now report the prompt tokens read from the provider's cache as `inputTokens.cacheRead`, so turn stats and telemetry show prompt-cache hits for them.
