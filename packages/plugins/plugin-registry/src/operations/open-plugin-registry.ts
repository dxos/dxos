//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import * as Operation from '@dxos/compute/Operation';

import { REGISTRY_ID } from '#meta';

const handler: Operation.WithHandler<typeof SettingsOperation.OpenPluginRegistry> =
  SettingsOperation.OpenPluginRegistry.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(REGISTRY_ID) });
      }),
    ),
  );

export default handler;
