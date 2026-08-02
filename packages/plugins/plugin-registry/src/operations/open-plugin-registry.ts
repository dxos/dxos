//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { GraphPath, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { REGISTRY_ID } from '#paths';

const handler: Operation.WithHandler<typeof SettingsOperation.OpenPluginRegistry> =
  SettingsOperation.OpenPluginRegistry.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(REGISTRY_ID) });
      }),
    ),
  );

export default handler;
