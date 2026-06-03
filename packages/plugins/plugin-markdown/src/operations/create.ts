//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Create> = MarkdownOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content }) {
      const object = Markdown.make({ name, content });
      yield* CollectionModel.add({ object });

      return {
        id: Obj.getURI(object),
      };
    }),
  ),
);

export default handler;
