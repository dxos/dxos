import { Rpc, RpcGroup } from '@effect/rpc';
import { Effect, Schema, Scope, Stream } from 'effect';

import * as Event from './Event';
import * as Service from './Service';

export const TickerService = Service.make('org.dxos.service.ticker', {
  rpc: RpcGroup.make(
    Rpc.make('org.dxos.service.ticker.add', {
      payload: {
        amount: Schema.Number,
      },
    }),
    Rpc.make('org.dxos.service.ticker.getValue', {
      success: Schema.Number,
    }),
    Rpc.make('org.dxos.service.ticker.subscribe', {
      success: Schema.Number,
      stream: true,
    }),
  ),
  events: [
    Event.make('org.dxos.service.ticker.updated', {
      data: Schema.Struct({
        value: Schema.Number,
      }),
      direction: 'server-to-client',
    }),
    Event.make('org.dxos.service.ticker.ping', {
      data: Schema.Void,
      direction: 'both',
    }),
  ],
});

const TickerRpcHandlers = TickerService.rpcGroup.toLayer({
  'org.dxos.service.ticker.add': Effect.fn(function* () {
    return 0;
  }),
  'org.dxos.service.ticker.getValue': Effect.fn(function* () {
    return 0;
  }),
  'org.dxos.service.ticker.subscribe': () => Stream.succeed(0),
});

const TickerEventHandler = TickerService.toLayerEventHandler(
  Effect.fn(function* (message) {
    switch (message._tag) {
      case 'org.dxos.service.ticker.ping':
        return message.data;
      case 'org.dxos.service.ticker.updated':
        return message.data;
      default:
        return Effect.die(new Error('Unknown event'));
    }
  }),
);

type TickerHandlers = Service.HandersFor<typeof TickerService>;
