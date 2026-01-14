//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';
import { OperationResolver } from '@dxos/operation';

import * as Common from '../../common';
import { ActivationEvent, Capability, Plugin } from '../../core';

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
    Plugin.addModule({
      id: 'Main',
      activatesOn: CountEvent,
      activate: () => Effect.succeed(Capability.contributes(Number, number)),
    }),
    Common.Plugin.addOperationResolverModule({
      activate: () =>
        Effect.succeed(
          Capability.contributes(Common.Capability.OperationResolver, [
            OperationResolver.make({
              operation: AlertOperation,
              handler: () => Effect.sync(() => window.alert(JSON.stringify({ number }))),
            }),
          ]),
        ),
    }),
    Plugin.make,
  )();
};
