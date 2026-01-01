//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Common from '../common';
import { Capability } from '../core';
import { createResolver } from '../plugin-intent';

import { SETTINGS_ID, SETTINGS_KEY, SettingsAction } from './actions';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: SettingsAction.Open,
        resolve: ({ plugin }) =>
          Effect.gen(function* () {
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: SETTINGS_ID });
            if (plugin) {
              // Fire and forget the open operation.
              yield* Effect.fork(
                invoke(Common.LayoutOperation.Open, {
                  subject: [`${SETTINGS_KEY}:${plugin.replaceAll('/', ':')}`],
                }),
              );
            }
          }),
      }),
    ),
  ),
);
