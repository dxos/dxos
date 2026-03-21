//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, SettingsOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { SETTINGS_ID, SETTINGS_KEY } from '../actions';

export default SettingsOperation.OpenPluginRegistry.pipe(
  Operation.withHandler(
    () =>
      Effect.gen(function* () {
        const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
        yield* invoke(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(SETTINGS_ID) });
        yield* Effect.fork(
          invoke(LayoutOperation.Open, {
            subject: [`${getSpacePath(SETTINGS_ID)}/${SETTINGS_KEY}:plugins`],
          }),
        );
      }),
  ),
);
