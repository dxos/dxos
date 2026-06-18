//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, Paths, SettingsOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { SETTINGS_ID, SETTINGS_KEY } from '../actions';

const handler: Operation.WithHandler<typeof SettingsOperation.OpenPluginRegistry> =
  SettingsOperation.OpenPluginRegistry.pipe(
    Operation.withHandler(() =>
      Effect.gen(function* () {
        const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
        yield* invoke(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(SETTINGS_ID) });
        // Await (don't fork): SwitchWorkspace selects the workspace's first child, so a forked Open
        // races/drops before its deck update applies. Awaiting guarantees the registry is selected.
        yield* invoke(LayoutOperation.Open, {
          subject: [`${Paths.getSpacePath(SETTINGS_ID)}/${SETTINGS_KEY}:plugins`],
        });
      }),
    ),
  );

export default handler;
