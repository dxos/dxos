//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../common';
import { Capability } from '../core';
import { OperationResolver } from '../plugin-operation';

import { SETTINGS_ID, SETTINGS_KEY, SettingsOperation } from './actions';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);

    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // Open Settings
      //
      OperationResolver.make({
        operation: SettingsOperation.Open,
        handler: (input) =>
          Effect.gen(function* () {
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: SETTINGS_ID });
            if (input.plugin) {
              // Fire and forget the open operation.
              yield* Effect.fork(
                invoke(Common.LayoutOperation.Open, {
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
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: SETTINGS_ID });
            yield* Effect.fork(
              invoke(Common.LayoutOperation.Open, {
                subject: [`${SETTINGS_KEY}:plugins`],
              }),
            );
          }),
      }),
    ]);
  }),
);
