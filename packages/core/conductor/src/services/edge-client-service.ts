//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import { raise } from '@dxos/debug';
import { type EdgeClient, type EdgeHttpClient } from '@dxos/edge-client';

export class EdgeClientService extends Context.Tag('EdgeClientService')<
  EdgeClientService,
  { readonly getEdgeClient: () => EdgeClient; readonly getEdgeHttpClient: () => EdgeHttpClient }
>() {
  static fromClient(client: EdgeClient, httpClient: EdgeHttpClient) {
    return Layer.succeed(EdgeClientService, {
      getEdgeClient: () => client,
      getEdgeHttpClient: () => httpClient,
    });
  }

  static notAvailable = Layer.succeed(EdgeClientService, {
    getEdgeClient: () => raise(new Error('Edge client not available')),
    getEdgeHttpClient: () => raise(new Error('Edge http client not available')),
  });
}