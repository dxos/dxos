//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../common';
import { Capability } from '../core';
import { OperationResolver } from '../plugin-operation';

import { SETTINGS_ID, SETTINGS_KEY, SettingsOperation } from './actions';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      //
      // Open Settings
      //
      OperationResolver.make({
        operation: SettingsOperation.Open,
        handler: (input) =>
          Effect.gen(function* () {
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
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
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: SETTINGS_ID });
            yield* Effect.fork(
              invoke(Common.LayoutOperation.Open, {
                subject: [`${SETTINGS_KEY}:plugins`],
              }),
            );
          }),
      }),
    ]),
  ),
);
