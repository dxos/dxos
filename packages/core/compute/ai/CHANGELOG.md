# @dxos/ai

## 0.12.0

### Minor Changes

- 24cbdff: `AiService` now resolves Effect's `DecisionModel` alongside `LanguageModel`: `AiService.decisionModel(...)` is new, and resolvers contribute decision models with `AiModelResolver.decisionResolver`. Breaking: `AiService.model` is renamed `AiService.languageModel` (both the module helper and the service method); build partial services with `AiService.make`. TypeSafe System One ships as `TypeSafeResolver` in `@dxos/ai/resolvers`, replacing the removed `@dxos/ai-typesafe` package.
- b2d5bb2: The Claude model catalog now serves Claude Opus 5 and Claude Sonnet 5 (`com.anthropic.model.claude-opus-5.default`, `com.anthropic.model.claude-sonnet-5.default`, both with thinking enabled), replacing Claude Opus 4.8 and Claude Sonnet 4.6 — the old model DXNs no longer resolve. A tool call whose parameters fail provider-side validation now ends the response stream cleanly instead of failing the request.
- 88e3ebd: Add DeepSeek as a model provider served through EDGE.

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

- 7b49616: `OpaqueToolkit.layer` is typed `Layer<Tool.Handler<any>, E, R>` instead of `Layer<unknown, E, R>`. The `unknown` was meant as opacity but is the top type, so `Effect.provide(toolkit.layer)` discharged every requirement a consumer had rather than only the handler ones; a program missing a service could typecheck. Code that relied on that now reports the missing service.

  `OpaqueToolkit.Any` takes optional `E` and `R` parameters (`Any<E = any, R = any>`), so a caller can name the handler layer's failure and requirement channels. Existing `T extends OpaqueToolkit.Any` constraints are unchanged. `createToolkit` is generic in both and returns `OpaqueToolkit<never, E, R>`, so a caller keeps the channels its toolkits declared instead of receiving them widened.

- 9ffccd5: `ScriptedLanguageModel` (`@dxos/ai/testing`) can script reasoning with `reasoning(text)`, emitted as
  provider-native `reasoning-*` parts, and hold a turn with `delay`. A script may also be a generator,
  `(request, index) => turn`, for a long-lived app that serves any number of conversations rather than
  one fixed test. `ScriptedRequest` now carries the names of the tools offered on the call.
- 3d23fd7: TypeSafe's jev decision model can now run on Cloudflare Workers AI: `AiService.decisionModel(Model.cloudflareJev.id)` answers through EDGE's Workers AI route, while `Model.typesafeJev` keeps TypeSafe's own API. `AiService.decisionModel` now accepts a model DXN as well as a bare NSID.

  Breaking: `TypeSafeResolver.make` takes routes per provider (`{ typesafe, workersAi }`), and `TypeSafeResolver.provider` and `TypeSafeResolver.jevLatest` are replaced by `Provider.typesafe` and `Model.typesafeJev`.

### Patch Changes

- 8363f12: Fix AI chat requests failing with `AiModelNotAvailableError`: the edge, local and bundled-sidecar model resolvers activated after the AI service had already snapshotted its resolver list. Ollama is now sent tool call arguments as an object, so the turn following a tool call is no longer rejected with HTTP 400. A model the configured provider does not serve is named in the chat's failure toast rather than reported as an unexpected error, and `@dxos/react-ui`'s translations are registered at startup so its primitives no longer render raw keys.
- a7f4329: Name the models EDGE serves (`Model.claudeOpus5`, `Model.deepseekV4Pro`, …) so a caller binds the catalog entry rather than restating its DXN as a string.
- 155ca6f: Importing `@dxos/ai` under plain Node no longer throws `TypeError: parsimmon.regexp is not a function`. The parser reached `parsimmon` — CommonJS that hangs every combinator off the exported function — through a namespace import, which Node resolves to a namespace carrying `default` alone; bundlers papered over it, so only consumers running the package unbundled were affected.
- c50f666: Telemetry no longer logs an error for every model output whose content serializes to nothing. `JSON.stringify` returns `undefined` rather than a string for `undefined`, and the content annotation tried to truncate it; it now skips the attribute instead.
- a7f4329: The direct testing preset retries a transient provider response, so a 5xx twenty minutes into a long scenario no longer ends it.
- 9477170: A tool call whose input the model emitted as invalid JSON no longer fails the request. `AiPreprocessor` previously raised on such a block, and because the block stays in the durable message history that made every subsequent request over the conversation fail too — one malformed tool call bricked the chat. The raw string is now passed through as the call's params, so the model sees what it wrote, alongside the tool-result error `callTool` already returns telling it to retry.
- 0524d38: A tool result with no value now serializes as `null` instead of omitting the field, so the next model request no longer fails schema decode.
- 49aee6c: Routines no longer burn turns fighting `completeJob`, and a completed job is no longer reported as a failure.

  - `completeJob`'s `success`, `failure` and `failure.description` parameters accept an explicit `null` alongside omission. Models routinely emit `null` for the branch they are not using, and the previous optional-only shape rejected that with `Invalid parameters for tool 'completeJob': Expected object | undefined`, so the agent had to guess a second and third encoding of the same completion signal (DX-1189).
  - When a call carries both a `success` payload and a `failure`, the success now wins: a model that filled the unused branch with a placeholder was discarding work the routine had actually completed.
  - The routine system prompt asks for one branch only, and omission of the other.
  - Tool failures log the tool name and error message explicitly, so a rejected tool call is diagnosable from a debug bundle.

- a7f4329: The chat-completions adapter sends an assistant turn's reasoning back to DeepSeek as `reasoning_content`. In thinking mode DeepSeek refuses a request whose earlier tool-calling turns come back without it, which ended every session at its first tool call that followed a thought.
- 3e02201: Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
  templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
  edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
  production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`), including
  `@dxos/edge-client`'s `DEFAULT_IMAGE_SERVICE_URL` (the retired `image-service-main` workers.dev
  name no longer resolves).
- 4aa6a33: MCP servers speak protocol revision 2026-07-28, which carries the client's identity and requested
  revision in each request rather than in a session opened by `initialize`. Effect moves to
  4.0.0-rc.117 for it. 2025-06-18 is still served, and everything it needs sits in `legacy-*` modules
  or under a marker naming the surface that must drop it, so removing that support later is deletion.

  `McpServer.normalizeResponse` takes the request, so a reply Effect framed as an event stream
  collapses back to its single JSON message, and a notification-only reply answers 202.
  `$mcp_initialize` is recorded once per successful handshake on either revision, and every MCP event
  carries a client name. `@dxos/log` gains a `noop` processor, which a server whose stdout carries a
  protocol selects so it logs only through the processors observability installs.

- 578b543: Recover from tool calls with malformed JSON arguments: the provider stream no longer aborts the request (the parse failure is caught whether it arrives as an error or a raw `SyntaxError` defect), a tool call truncated mid-stream is finalized instead of staying pending forever, and unparseable arguments are reported back to the model as a tool error so it can retry.
- e426625: TypeSafe decisions can route through EDGE's `/ai/generate/typesafe` proxy: `EdgeAiService` in `@dxos/edge-client` accepts `'typesafe'`, and `TypeSafeResolver`'s `apiKey` may resolve to `undefined`, sending no credential, for a proxy that authenticates upstream.
- Updated dependencies [a92ea18]
- Updated dependencies [0c6c186]
- Updated dependencies [af1c007]
- Updated dependencies [4862c8e]
- Updated dependencies [106d38a]
- Updated dependencies [9049c30]
- Updated dependencies [6186edc]
- Updated dependencies [e3ceced]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [4ececc6]
- Updated dependencies [c95def4]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [b1dc20c]
- Updated dependencies [ac71815]
- Updated dependencies [7c87626]
- Updated dependencies [f82c78f]
- Updated dependencies [63fc847]
- Updated dependencies [0fe00c5]
- Updated dependencies [f3f55a8]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [fd23a8b]
- Updated dependencies [6ef35a6]
- Updated dependencies [ea11703]
- Updated dependencies [b2caee6]
- Updated dependencies [9baf25f]
- Updated dependencies [dcf911b]
- Updated dependencies [b83b831]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [6f4a887]
- Updated dependencies [d0beedc]
- Updated dependencies [731b264]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [07565c8]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [6409948]
- Updated dependencies [792c756]
- Updated dependencies [1cf6347]
- Updated dependencies [0cde959]
- Updated dependencies [e094f74]
- Updated dependencies [9ab38fa]
- Updated dependencies [b3673ee]
- Updated dependencies [915db6a]
- Updated dependencies [2e4c299]
- Updated dependencies [a3b6ef0]
- Updated dependencies [782a442]
- Updated dependencies [b02fe16]
- Updated dependencies [472ca95]
- Updated dependencies [252ca39]
- Updated dependencies [8fb29b3]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [0264069]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [872f391]
- Updated dependencies [51820a1]
- Updated dependencies [9ae0e5f]
- Updated dependencies [7d000b9]
- Updated dependencies [66e9264]
- Updated dependencies [84362af]
- Updated dependencies [76d6fca]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [eeff74c]
- Updated dependencies [967b130]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [72f7584]
- Updated dependencies [e94ed89]
- Updated dependencies [882ac2a]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [851791f]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [4aa6a33]
- Updated dependencies [0ac2e5f]
- Updated dependencies [9426389]
- Updated dependencies [2e5e188]
- Updated dependencies [ebb8f4a]
- Updated dependencies [9d2466a]
- Updated dependencies [ca34a80]
- Updated dependencies [9f2557b]
- Updated dependencies [a283607]
- Updated dependencies [24fcadc]
- Updated dependencies [b00ee72]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [cd4da46]
- Updated dependencies [78e5596]
- Updated dependencies [b1bb838]
- Updated dependencies [19f19a2]
- Updated dependencies [2a41efd]
- Updated dependencies [142ba02]
- Updated dependencies [e1ee9dd]
- Updated dependencies [256f286]
- Updated dependencies [690dcaa]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [a574300]
- Updated dependencies [2513a52]
- Updated dependencies [17ed864]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [f4c2702]
- Updated dependencies [7407d65]
- Updated dependencies [318bbad]
- Updated dependencies [9a3f01e]
- Updated dependencies [ea11703]
- Updated dependencies [fa82aef]
- Updated dependencies [18597fc]
- Updated dependencies [9205bd3]
- Updated dependencies [fce2060]
- Updated dependencies [bda45ac]
- Updated dependencies [5885380]
- Updated dependencies [881f900]
- Updated dependencies [6a1ec57]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [693d1b4]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [3ea8217]
- Updated dependencies [559acfa]
- Updated dependencies [1862edc]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [c209b42]
- Updated dependencies [4da1052]
- Updated dependencies [eda8b55]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
- Updated dependencies [6dadb41]
  - @dxos/echo@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/types@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/util@0.12.0
  - @dxos/log@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/config@0.11.1
- @dxos/context@0.11.1
- @dxos/debug@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/graph@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/protocols@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- bdf9f68: Add routed scripts to the scripted test language model (per-session cursors for supervisor/sub-agent scenarios) and restore per-message span publishing from the chat thread (minimap markers and prompt navigation).
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [3f1fc67]
- Updated dependencies [962c8cd]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [3761762]
- Updated dependencies [c727a43]
- Updated dependencies [4bb7e3b]
- Updated dependencies [41141d8]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/util@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/config@0.11.0
  - @dxos/graph@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0
