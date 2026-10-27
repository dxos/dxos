//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { CanvasOperation } from '#types';

import { generatorCompiler } from '../model/compiler.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.UpdateGenerator> = CanvasOperation.UpdateGenerator.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ generator: ref, source, description, params }) {
      const generator = yield* Database.load(ref);
      Obj.update(generator, (generator) => {
        if (source !== undefined) {
          generator.source = source;
        }
        if (description !== undefined) {
          generator.description = description;
        }
        if (params !== undefined) {
          generator.params = params;
        }
        // Every revision is a new version, so canvases recompile and replay it.
        generator.version += 1;
      });
      const compiled = yield* Effect.promise(() => generatorCompiler(generator.source));
      return { version: generator.version, ...(compiled.errors ? { errors: compiled.errors } : {}) };
    }),
  ),
);

export default handler;
