//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { Operation, OperationResolver } from '@dxos/operation';

import { REGISTRY_ID } from '../../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: SettingsOperation.OpenPluginRegistry,
        handler: Effect.fnUntraced(function* () {
          yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: REGISTRY_ID });
        }),
      }),
    ]);
  }),
);
