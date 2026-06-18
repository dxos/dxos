//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, Paths, SettingsOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { SETTINGS_ID, getPluginSettingsSectionPath } from '../types';

const handler: Operation.WithHandler<typeof SettingsOperation.Open> = SettingsOperation.Open.pipe(
  Operation.withHandler((input) =>
    Effect.gen(function* () {
      const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
      yield* invoke(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(SETTINGS_ID) });
      if (input.plugin) {
        // Await (don't fork): SwitchWorkspace already selects the workspace's first child, so a
        // forked Open for the requested plugin races/drops before its deck update applies, leaving
        // the wrong plugin selected. Awaiting guarantees the requested plugin becomes the selection.
        yield* invoke(LayoutOperation.Open, {
          subject: [getPluginSettingsSectionPath(input.plugin)],
        });
      }
    }),
  ),
);

export default handler;
