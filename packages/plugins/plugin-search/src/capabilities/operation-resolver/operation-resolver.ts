//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';

import { SearchOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SearchOperation.OpenSearch,
        handler: () =>
          Effect.gen(function* () {
            yield* Operation.invoke(Common.LayoutOperation.UpdateComplementary, { subject: 'search' });
          }),
      }),
    ]);
  }),
);
