# @dxos/ai

## 0.12.0

### Minor Changes

- b2d5bb2: The Claude model catalog now serves Claude Opus 5 and Claude Sonnet 5 (`com.anthropic.model.claude-opus-5.default`, `com.anthropic.model.claude-sonnet-5.default`, both with thinking enabled), replacing Claude Opus 4.8 and Claude Sonnet 4.6 — the old model DXNs no longer resolve. A tool call whose parameters fail provider-side validation now ends the response stream cleanly instead of failing the request.

### Patch Changes

- 8363f12: Fix AI chat requests failing with `AiModelNotAvailableError`: the edge, local and bundled-sidecar model resolvers activated after the AI service had already snapshotted its resolver list. Ollama is now sent tool call arguments as an object, so the turn following a tool call is no longer rejected with HTTP 400. A model the configured provider does not serve is named in the chat's failure toast rather than reported as an unexpected error, and `@dxos/react-ui`'s translations are registered at startup so its primitives no longer render raw keys.
- 9477170: A tool call whose input the model emitted as invalid JSON no longer fails the request. `AiPreprocessor` previously raised on such a block, and because the block stays in the durable message history that made every subsequent request over the conversation fail too — one malformed tool call bricked the chat. The raw string is now passed through as the call's params, so the model sees what it wrote, alongside the tool-result error `callTool` already returns telling it to retry.
- 49aee6c: Routines no longer burn turns fighting `completeJob`, and a completed job is no longer reported as a failure.

  - `completeJob`'s `success`, `failure` and `failure.description` parameters accept an explicit `null` alongside omission. Models routinely emit `null` for the branch they are not using, and the previous optional-only shape rejected that with `Invalid parameters for tool 'completeJob': Expected object | undefined`, so the agent had to guess a second and third encoding of the same completion signal (DX-1189).
  - When a call carries both a `success` payload and a `failure`, the success now wins: a model that filled the unused branch with a placeholder was discarding work the routine had actually completed.
  - The routine system prompt asks for one branch only, and omission of the other.
  - Tool failures log the tool name and error message explicitly, so a rejected tool call is diagnosable from a debug bundle.

- 3e02201: Default service URLs follow the EDGE environment rename (DX-1150): the config preset and CLI profile
  templates gain `preview` (with `main` preserved as a deprecated alias of the same worker), the default
  edge URL moves to `https://preview.dxos.network`, and the Image/Introspect service defaults become the
  production hostnames (`image.dxos.network`, `introspect.dxos.network/mcp`), including
  `@dxos/edge-client`'s `DEFAULT_IMAGE_SERVICE_URL` (the retired `image-service-main` workers.dev
  name no longer resolves).
- 578b543: Recover from tool calls with malformed JSON arguments: the provider stream no longer aborts the request (the parse failure is caught whether it arrives as an error or a raw `SyntaxError` defect), a tool call truncated mid-stream is finalized instead of staying pending forever, and unparseable arguments are reported back to the model as a tool error so it can retry.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [0fe00c5]
- Updated dependencies [f3f55a8]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [12b6618]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [cd4da46]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [f962a7d]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [d8e9de1]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [97efbaa]
- Updated dependencies [e8088ea]
- Updated dependencies [5d816a6]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/types@0.12.0
  - @dxos/util@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0
  - @dxos/node-std@0.12.0

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
