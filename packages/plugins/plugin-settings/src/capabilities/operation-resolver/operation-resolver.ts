//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { OperationResolver } from '@dxos/operation';

import { SETTINGS_ID, SETTINGS_KEY } from '../../actions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      //
      // Open Settings
      //
      OperationResolver.make({
        operation: SettingsOperation.Open,
        handler: (input) =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
            yield* invoke(LayoutOperation.SwitchWorkspace, { subject: SETTINGS_ID });
            if (input.plugin) {
              // Fire and forget the open operation.
              yield* Effect.fork(
                invoke(LayoutOperation.Open, {
                  subject: [`${SETTINGS_KEY}:${input.plugin.replaceAll('/', ':')}`],
                }),
              );
            }
          }),
      }),

      //
      // Open Plugin Registry
      //
      OperationResolver.make({
        operation: SettingsOperation.OpenPluginRegistry,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
            yield* invoke(LayoutOperation.SwitchWorkspace, { subject: SETTINGS_ID });
            yield* Effect.fork(
              invoke(LayoutOperation.Open, {
                subject: [`${SETTINGS_KEY}:plugins`],
              }),
            );
          }),
      }),
    ]);
  }),
);
