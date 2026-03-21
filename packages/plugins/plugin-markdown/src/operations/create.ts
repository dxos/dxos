//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { CollectionModel } from '@dxos/schema';

import { Create } from './definitions';
import { Markdown } from '../types';

export default Create.pipe(
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
