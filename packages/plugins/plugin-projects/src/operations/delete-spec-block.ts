//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { ProjectOperation } from '#types';

import { SpecBlockError, cutFence, findBlock, loadDocument, writeContent } from './spec-block.ts';

const handler: Operation.WithHandler<typeof ProjectOperation.DeleteSpecBlock> = ProjectOperation.DeleteSpecBlock.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ spec, block }) {
      const { document } = yield* loadDocument(spec);
      const item = findBlock(document, block);
      if (!item) {
        return yield* Effect.fail(new SpecBlockError({ message: `No block ${block}.` }));
      }
      writeContent(document.text, cutFence(document.content, item.block.fence));
    }),
  ),
);

export default handler;
