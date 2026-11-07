//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { ProjectOperation } from '#types';

import { loadDocument, toSpecBlock } from './spec-block.ts';

const handler: Operation.WithHandler<typeof ProjectOperation.GetSpecBlocks> = ProjectOperation.GetSpecBlocks.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ spec, kind }) {
      const { document } = yield* loadDocument(spec);
      return {
        blocks: document.items
          .filter((item) => !item.entry && (kind === undefined || item.kind === kind))
          .map((item) => toSpecBlock(document, item)),
      };
    }),
  ),
);

export default handler;
