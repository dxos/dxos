//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation, OperationResolver } from '@dxos/operation';

import { SEARCH_DIALOG } from '../../constants';
import { SearchOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: SearchOperation.OpenSearch,
        handler: Effect.fnUntraced(function* () {
          yield* Operation.invoke(LayoutOperation.UpdateDialog, {
            subject: SEARCH_DIALOG,
            blockAlign: 'start',
          });
        }),
      }),
    ]);
  }),
);
