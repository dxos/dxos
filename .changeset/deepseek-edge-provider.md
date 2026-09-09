---
'@dxos/ai': minor
'@dxos/edge-client': minor
'@dxos/plugin-assistant': minor
---

Add DeepSeek as a model provider served through EDGE.

`Model.all` gains `deepseek-v4-flash` and `deepseek-v4-pro` under the edge provider, and a new
`service` field distinguishes the upstream behind each edge model so `AnthropicResolver` and the
new `DeepSeekResolver` each serve only their own entries. DeepSeek speaks the OpenAI-compatible
chat-completions dialect, so it reuses `ChatCompletionsAdapter` — which now understands
`reasoning_content`, can request streamed usage via `stream_options.include_usage`, and accepts
per-model request-body fields (`RequestOptions.body`) so the resolver can send DeepSeek's
`thinking` parameter. V4 serves thinking and non-thinking mode from one model name, and thinking is
on by default, so an explicit opt-out is sent when `thinking: false` is requested.

`EdgeHttpClient.anthropicAiRequest` is now `aiRequest(service, request)`, routing to
`/ai/generate/<service>`; `EdgeAiHttpClient.layer` takes the service it should target. That request
now uses `redirect: 'error'`, since its headers carry the EDGE credential and any BYOK key.
