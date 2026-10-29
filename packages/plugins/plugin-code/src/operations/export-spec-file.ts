//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as TextMerge from '@dxos/plugin-github/TextMerge';

import { CodeOperation } from '#types';

import { loadSpecText } from './spec-file.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ExportSpecFile> = CodeOperation.ExportSpecFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ object }) {
      const { text } = yield* loadSpecText(object);
      return { content: text.content, heads: TextMerge.currentHeads(text) };
    }),
  ),
);

export default handler;
