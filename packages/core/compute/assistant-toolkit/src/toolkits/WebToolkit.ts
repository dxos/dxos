//
// Copyright 2025 DXOS.org
//

import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { proxyFetchLegacy } from '@dxos/edge-client/cors-proxy';

// TODO(dmaretskyi): Testing only.
export const WebToolkit = Toolkit.make(
  AnthropicTool.WebSearch_20250305({}).pipe(
    // TODO(dmaretskyi): Effect bug -- provider-defined tools don't support annotations.
    // ToolFormatter.assign({
    //   debugFormatResult: (result) =>
    //     Array.isArray(result) ? result.map(Struct.pick('title', 'type', 'url', 'page_age')) : result,
    // }),
  ),
  Tool.make('WebFetch', {
    parameters: {
      url: Schema.String,
    },
    success: Schema.String,
  }),
);

export const layer = WebToolkit.toLayer({
  WebFetch: Effect.fnUntraced(function* ({ url }) {
    return yield* Effect.tryPromise({
      try: async (): Promise<string> => {
        const response = await proxyFetchLegacy(new URL(url));
        if (!response.ok) {
          const body = await response.text();
          return `Fetch failed with status ${response.status}: ${body.slice(0, 256)}`;
        }
        return await response.text();
      },
      catch: (cause) => new Error(String(cause)),
    }).pipe(Effect.catchAll((err) => Effect.succeed(err.message)));
  }),
});
