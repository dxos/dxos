//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import type { AiServiceClient } from '@dxos/ai';

// TODO(burdon): Move to @dxos/ai.
export class AiService extends Context.Tag('AiService')<
  AiService,
  {
    readonly client: AiServiceClient;
  }
>() {
  static make = (client: AiServiceClient): Context.Tag.Service<AiService> => {
    return {
      get client() {
        return client;
      },
    };
  };

  static makeLayer = (client: AiServiceClient): Layer.Layer<AiService> =>
    Layer.succeed(AiService, AiService.make(client));

  static notAvailable = Layer.succeed(AiService, {
    get client(): AiServiceClient {
      throw new Error('AiService not available');
    },
  });
}
