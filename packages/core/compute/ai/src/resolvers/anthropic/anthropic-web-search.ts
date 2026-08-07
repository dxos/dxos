//
// Copyright 2026 DXOS.org
//

import * as Generated from '@effect/ai-anthropic/Generated';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import * as Tool from 'effect/unstable/ai/Tool';

/**
 * Provider-defined Anthropic web search tool with per-call `parameters`.
 * effect-ai-anthropic's `WebSearch_20250305` omits `parameters`, so stream decoding fails when
 * the provider sends `{ query }` on the aggregated `tool-call` part.
 */
export const AnthropicWebSearchTool = Tool.providerDefined({
  id: 'anthropic.web_search_20250305',
  customName: 'AnthropicWebSearch',
  providerName: 'web_search',
  parameters: Schema.Struct({
    query: Schema.String,
  }),
  args: Schema.Struct(Struct.omit(Generated.WebSearchTool_20250305.fields, ['name', 'type'])),
  success: Schema.Array(Generated.RequestWebSearchResultBlock),
  failure: Generated.ResponseWebSearchToolResultError,
})({});
