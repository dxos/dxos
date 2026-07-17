//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ActivationEvent, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { AppPlugin } from '../../app-framework';

export const Number = Capability.make<number>('org.dxos.test.generator.number');

export const CountEvent = ActivationEvent.make('org.dxos.test.generator.count');

export const createPluginId = (id: string): DXN.DXN => DXN.make(`org.dxos.test.generator.${id}`);

export const createAlertOperation = (id: DXN.DXN) =>
  Operation.make({
    meta: { key: DXN.make(`${DXN.getName(id)}.operation.alert`), name: 'Alert' },
    input: Schema.Void,
    output: Schema.Void,
  });

export const createNumberPlugin = (id: string) => {
  const pluginId: DXN.DXN = DXN.tryMake(id) ?? DXN.make(id);
  const number = Math.floor(Math.random() * 100);
  const AlertOperation = createAlertOperation(pluginId);

  return Plugin.define(Plugin.makeMeta({ key: pluginId, name: `Plugin ${DXN.getName(pluginId)}` })).pipe(
    AppPlugin.addOperationHandlerModule({
      provides: [Capabilities.OperationHandler],
      activate: () =>
        Effect.succeed([
          Capability.provide(
            Capabilities.OperationHandler,
            OperationHandlerSet.make(
              Operation.withHandler(AlertOperation, () => Effect.sync(() => window.alert(JSON.stringify({ number })))),
            ),
          ),
        ]),
    }),
    Plugin.addModule({
      id: 'Main',
      activatesOn: CountEvent,
      activate: () => Effect.succeed(Capability.contributes(Number, number)),
    }),
    Plugin.make,
  )();
};
