//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { CanvasOperation, Generator } from '#types';

import { generatorCompiler } from '../model/compiler.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.CreateGenerator> = CanvasOperation.CreateGenerator.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, description, source, params }) {
      const generator = yield* Database.add(Generator.make({ name, description, source, params }));
      const compiled = yield* Effect.promise(() => generatorCompiler(source));
      return {
        generator: Ref.make(generator),
        version: generator.version,
        ...(compiled.errors ? { errors: compiled.errors } : {}),
      };
    }),
  ),
);

export default handler;
