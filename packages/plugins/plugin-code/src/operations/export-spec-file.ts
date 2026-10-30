//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as TextMerge from '@dxos/plugin-github/TextMerge';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { writeThrough } from '#sync';
import { CodeOperation } from '#types';

import { CodeOperationError } from '../errors.ts';
import { loadSpecText } from './spec-file.ts';

const handler: Operation.WithHandler<typeof CodeOperation.ExportSpecFile> = CodeOperation.ExportSpecFile.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ object, base }) {
      const { spec, text } = yield* loadSpecText(object);
      const codecs = yield* Capability.getAll(ProjectCapabilities.SpecCodec);
      // Written against the file as GitHub holds it, so what did not change keeps its form.
      const written = yield* writeThrough(codecs, spec, base);
      if (written !== undefined) {
        if (base === undefined) {
          // Without it each block would be written anew, rewriting the file's own forms.
          return yield* Effect.fail(new CodeOperationError({ message: `No synced file text for ${spec.id}` }));
        }
        return { content: written, heads: TextMerge.currentHeads(text) };
      }
      return { content: text.content, heads: TextMerge.currentHeads(text) };
    }),
  ),
);

export default handler;
