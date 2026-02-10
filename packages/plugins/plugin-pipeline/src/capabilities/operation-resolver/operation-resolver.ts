//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { OperationResolver } from '@dxos/operation';
import { Collection } from '@dxos/schema';
import { Pipeline } from '@dxos/types';

import { PipelineOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: PipelineOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ rootCollection }) {
          const collection = Collection.makeManaged({ key: Type.getTypename(Pipeline.Pipeline) });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(collection));
          });
        }),
      }),
    ]),
  ),
);
