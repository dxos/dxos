//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Schema from 'effect/Schema';
import * as Tool from '@effect/ai/Tool';
import * as Effect from 'effect/Effect';

export const WebToolkit = Toolkit.make(
  AnthropicTool.WebSearch_20250305({}),
  Tool.make('WebFetch', {
    parameters: {
      url: Schema.String,
    },
    success: Schema.String,
  }),
);

export const layer = WebToolkit.toLayer({
  WebFetch: Effect.fnUntraced(function* ({ url }) {
    const response = yield* Effect.promise(() => fetch(url).then((response) => response.text()));
    return response;
  }),
});
