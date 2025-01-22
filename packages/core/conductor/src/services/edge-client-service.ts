import { Context, Layer } from 'effect';
import { EdgeClient } from '@dxos/edge-client';
import { raise } from '@dxos/debug';

export class EdgeClientService extends Context.Tag('EdgeClientService')<
  EdgeClientService,
  { readonly getEdgeClient: () => EdgeClient }
>() {
  static fromClient(client: EdgeClient) {
    return Layer.succeed(EdgeClientService, { getEdgeClient: () => client });
  }

  static notAvailable = Layer.succeed(EdgeClientService, {
    getEdgeClient: () => raise(new Error('Edge client not available')),
  });
}
