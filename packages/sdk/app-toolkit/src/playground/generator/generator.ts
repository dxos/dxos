//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ActivationEvent, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';

import { AppPlugin } from '../../plugin';

export const Number = Capability.make<number>('dxos.org/test/generator/number');

export const CountEvent = ActivationEvent.make('dxos.org/test/generator/count');

export const createPluginId = (id: string) => `dxos.org/test/generator/${id}`;

export const createAlertOperation = (id: string) =>
  Operation.make({
    meta: { key: `${createPluginId(id)}/operation/alert`, name: 'Alert' },
    schema: { input: Schema.Void, output: Schema.Void },
  });

export const createNumberPlugin = (id: string) => {
  const number = Math.floor(Math.random() * 100);
  const AlertOperation = createAlertOperation(id);

  return Plugin.define({ id, name: `Plugin ${id}` }).pipe(
    AppPlugin.addOperationResolverModule({
      activate: () =>
        Effect.succeed(
          Capability.contributes(Capabilities.OperationResolver, [
            OperationResolver.make({
              operation: AlertOperation,
              handler: () => Effect.sync(() => window.alert(JSON.stringify({ number }))),
            }),
          ]),
        ),
    }),
    Plugin.addModule({
      id: 'Main',
      activatesOn: CountEvent,
      activate: () => Effect.succeed(Capability.contributes(Number, number)),
    }),
    Plugin.make,
  )();
};
