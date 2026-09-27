---
'@dxos/ai': patch
---

The chat-completions adapter now reports prompt-cache hits. DeepSeek's `prompt_cache_hit_tokens` and OpenAI's `prompt_tokens_details.cached_tokens` are split out of the input tokens as `cacheRead` and `uncached` on the finish part. Previously every DeepSeek call read as a full cache miss.
