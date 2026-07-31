//
// Copyright 2026 DXOS.org
//

import * as Response from '@effect/ai/Response';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { AnthropicWebSearchTool } from './anthropic-web-search';

const WebSearchToolkit = Toolkit.make(AnthropicWebSearchTool);
const StreamPartSchema = Response.StreamPart(WebSearchToolkit);

describe('AnthropicWebSearchTool', () => {
  test('decodes aggregated tool-call params with query', () => {
    const part = Response.makePart('tool-call', {
      id: 'call_1',
      name: 'AnthropicWebSearch',
      params: { query: 'capital of France' },
      providerExecuted: true,
    });

    expect(Schema.decodeSync(StreamPartSchema)(part)).toEqual(part);
  });
});
