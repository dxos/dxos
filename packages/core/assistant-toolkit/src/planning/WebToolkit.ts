//
// Copyright 2025 DXOS.org
//

import * as Toolkit from '@effect/ai/Toolkit';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Schema from 'effect/Schema';
import * as Tool from '@effect/ai/Tool';
import * as Effect from 'effect/Effect';
import { ToolFormatter } from '@dxos/ai';
import { Struct } from 'effect';

export const WebToolkit = Toolkit.make(
  AnthropicTool.WebSearch_20250305({})
    .pipe
    // ToolFormatter.assign({
    //   debugFormatResult: (result) =>
    //     Array.isArray(result) ? result.map(Struct.pick('title', 'type', 'url', 'page_age')) : result,
    // }),
    (),
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
