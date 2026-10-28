//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import * as TextMerge from '@dxos/plugin-github/TextMerge';
import { SpecDocument } from '@dxos/types';

import { CodeOperation } from '#types';

import { loadSpecText, specName } from './spec-file.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ImportSpecFile> = CodeOperation.ImportSpecFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ path, content, base, object, heads }) {
      if (!object || !heads || base === undefined) {
        const spec = yield* Database.add(SpecDocument.make({ name: specName(path), content }));
        const { text } = yield* loadSpecText(Ref.make(spec));
        return { object: Ref.make(spec), heads: TextMerge.currentHeads(text) };
      }
      // Spec.content is Text, so the remote change merges with local edits character by character (F-6.2).
      const { text } = yield* loadSpecText(object);
      const next = yield* TextMerge.applyAt(text, { base, next: content, heads });
      return { object, heads: next };
    }),
  ),
);

export default handler;
