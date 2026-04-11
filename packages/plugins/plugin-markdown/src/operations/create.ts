//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { CollectionModel } from '@dxos/schema';

import { Markdown } from '../types';
import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content }) {
      const object = Markdown.make({ name, content });
      yield* CollectionModel.add({ object });

      return {
        id: Obj.getDXN(object).toString(),
      };
    }),
  ),
);

export default handler;
