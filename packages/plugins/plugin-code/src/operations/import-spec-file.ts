//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import * as TextMerge from '@dxos/plugin-github/TextMerge';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import { SpecDocument } from '@dxos/types';

import { readThrough, writeThrough } from '#sync';
import { CodeOperation } from '#types';

import { loadSpecText, specName } from './spec-file.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ImportSpecFile> = CodeOperation.ImportSpecFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ path, content, base, object, heads }) {
      const codecs = yield* Capability.getAll(ProjectCapabilities.SpecDocumentCodec);
      if (!object || !heads || base === undefined) {
        const spec = yield* Database.add(SpecDocument.make({ name: specName(path), content }));
        yield* readThrough(codecs, spec, content, path);
        const { text } = yield* loadSpecText(Ref.make(spec));
        return { object: Ref.make(spec), heads: TextMerge.currentHeads(text) };
      }

      const { spec, text } = yield* loadSpecText(object);
      // A document a codec writes holds its file in another form, so the change merges in the file's form (F-6.2).
      const local = yield* writeThrough(codecs, spec, base);
      if (local !== undefined) {
        const merged = TextMerge.merge({ base, local, next: content });
        yield* readThrough(codecs, spec, merged, path);
        return { object, heads: TextMerge.currentHeads(text) };
      }

      // Spec.content is Text, so the remote change merges with local edits character by character (F-6.2).
      const next = yield* TextMerge.applyAt(text, { base, next: content, heads });
      // A change that brings the file its first `feat` block can make the document a codec's.
      if (yield* readThrough(codecs, spec, text.content, path)) {
        return { object, heads: TextMerge.currentHeads(text) };
      }
      return { object, heads: next };
    }),
  ),
);

export default handler;
