---
'@dxos/ai': minor
'@dxos/plugin-assistant': minor
---

Add DeepSeek as a model provider served through EDGE.

`Model.all` gains `deepseek-v4-flash` and `deepseek-v4-pro` under the edge provider. Because the
edge provider now fronts more than one upstream, each resolver claims its own models by the
developer authority in the id (`Model.developer`), so `AnthropicResolver` and the new
`DeepSeekResolver` never serve each other's entries and the catalog entry needs no extra marker.

DeepSeek speaks the OpenAI-compatible chat-completions dialect, so it reuses
`ChatCompletionsAdapter` — which now understands `reasoning_content`, can request streamed usage
via `stream_options.include_usage`, and accepts per-model request-body fields
(`RequestOptions.body`) so the resolver can send DeepSeek's `thinking` parameter. V4 serves thinking
and non-thinking mode from one model name, and thinking is on by default, so an explicit opt-out is
sent when `thinking: false` is requested.

Streamed responses now emit the `finish` part exactly once, after the source drains, carrying the
last usage reported. Previously an OpenAI-format stream emitted a second, usage-less `finish` for
the `data: [DONE]` sentinel that follows the `finish_reason` chunk, and usage arriving in a trailing
`choices: []` chunk (as OpenAI itself reports it) was dropped.

`EdgeHttpClient.anthropicAiRequest` is now `aiRequest(service, request)`, routing to
`/ai/generate/<service>`; `EdgeAiHttpClient.layer` takes the service it should target. That request
now uses `redirect: 'error'`, since its headers carry the EDGE credential and any BYOK key.

`plugin-deepseek`'s `RunHarness` tool description named `deepseek-chat`, discontinued on
2026-07-24; it now names the V4 ids. That string is read by a model choosing a value, so the stale
example would have produced an id the provider rejects.
