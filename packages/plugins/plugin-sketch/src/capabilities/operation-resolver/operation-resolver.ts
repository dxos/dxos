//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { OperationResolver } from '@dxos/operation';
import { Collection } from '@dxos/schema';

import { Diagram, SketchOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: SketchOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ rootCollection }) {
          const collection = Collection.makeManaged({ key: Type.getTypename(Diagram.Diagram) });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(collection));
          });
        }),
      }),
      OperationResolver.make({
        operation: SketchOperation.Create,
        handler: ({ name, schema = Diagram.TLDRAW_SCHEMA, content = {} }) =>
          Effect.succeed({
            object: Diagram.make({ name, canvas: { schema, content } }),
          }),
      }),
    ]),
  ),
);
