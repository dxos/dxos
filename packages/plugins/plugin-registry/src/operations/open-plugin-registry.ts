//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, SettingsOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { REGISTRY_ID } from '../meta';

export default SettingsOperation.OpenPluginRegistry.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(REGISTRY_ID) });
    }),
  ),
);
