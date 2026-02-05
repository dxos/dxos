//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { OperationResolver } from '@dxos/operation';
import { Collection } from '@dxos/schema';

import { Journal, Outline, OutlineOperation, OutlinerOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: OutlinerOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ rootCollection }) {
          const journalCollection = Collection.makeManaged({ key: Type.getTypename(Journal.Journal) });
          const outlineCollection = Collection.makeManaged({ key: Type.getTypename(Outline.Outline) });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(journalCollection));
            c.objects.push(Ref.make(outlineCollection));
          });
        }),
      }),
      OperationResolver.make({
        operation: OutlineOperation.CreateOutline,
        handler: ({ name }) =>
          Effect.succeed({
            object: Outline.make({ name }),
          }),
      }),
    ]),
  ),
);
