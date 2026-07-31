//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';

import { SETTINGS_ID, getPluginRegistrySectionPath } from '../types';

const handler: Operation.WithHandler<typeof SettingsOperation.OpenPluginRegistry> =
  SettingsOperation.OpenPluginRegistry.pipe(
    Operation.withHandler(() =>
      Effect.gen(function* () {
        const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
        yield* invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(SETTINGS_ID) });
        // Await (don't fork): SwitchWorkspace selects the workspace's first child, so a forked Open
        // races/drops before its deck update applies. Awaiting guarantees the registry is selected.
        yield* invoke(LayoutOperation.Open, {
          subject: [getPluginRegistrySectionPath()],
        });
      }),
    ),
  );

export default handler;
