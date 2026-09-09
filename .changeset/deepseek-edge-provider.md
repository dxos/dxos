---
'@dxos/ai': minor
'@dxos/edge-client': minor
'@dxos/plugin-assistant': minor
---

Add DeepSeek as a model provider served through EDGE.

`Model.all` gains `deepseek-chat` and `deepseek-reasoner` under the edge provider, and a new
`service` field distinguishes the upstream behind each edge model so `AnthropicResolver` and the
new `DeepSeekResolver` each serve only their own entries. DeepSeek speaks the OpenAI-compatible
chat-completions dialect, so it reuses `ChatCompletionsAdapter` — which now understands
`reasoning_content` and can request streamed usage via `stream_options.include_usage`.

`EdgeHttpClient.anthropicAiRequest` is now `aiRequest(service, request)`, routing to
`/ai/generate/<service>`; `EdgeAiHttpClient.layer` takes the service it should target.
