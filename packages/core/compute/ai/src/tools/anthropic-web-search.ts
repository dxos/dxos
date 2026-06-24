//
// Copyright 2026 DXOS.org
//

import { Generated } from '@effect/ai-anthropic';
import * as Tool from '@effect/ai/Tool';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/**
 * Provider-defined Anthropic web search tool with per-call `parameters`.
 * effect-ai-anthropic's `WebSearch_20250305` omits `parameters`, so stream decoding fails when
 * the provider sends `{ query }` on the aggregated `tool-call` part.
 */
export const AnthropicWebSearchTool = Tool.providerDefined({
  id: 'anthropic.web_search_20250305',
  toolkitName: 'AnthropicWebSearch',
  providerName: 'web_search',
  parameters: {
    query: Schema.String,
  },
  args: Struct.omit(Generated.WebSearchTool20250305.fields, 'name', 'type'),
  success: Schema.Array(Generated.RequestWebSearchResultBlock),
  failure: Generated.ResponseWebSearchToolResultError,
})({});
