//
// Copyright 2026 DXOS.org
//

import * as Args from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';

import { CommandConfig, Common, FormBuilder, flushAndSync, print, spaceLayer } from '@dxos/cli-util';
import { Database } from '@dxos/echo';

import { DrawingFile } from '#model';

/** Adds the drawing a `.dx.svg` carries to the space, under fresh ids. */
export const handler = Effect.fn(function* ({ file }: { file: string }) {
  const { json } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;
  const { db } = yield* Database.Service;

  const drawing = yield* DrawingFile.importDxSvg(yield* fs.readFileString(file));
  yield* flushAndSync({ indexes: true });

  if (json) {
    yield* Console.log(JSON.stringify({ id: drawing.id, name: drawing.name, spaceId: db.spaceId }, null, 2));
  } else {
    const builder = FormBuilder.make({ title: drawing.name ?? 'Drawing' }).pipe(
      FormBuilder.set('id', drawing.id),
      FormBuilder.set('space', db.spaceId),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const importDrawing = Command.make(
  'import',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    file: Args.File('file').pipe(Args.withDescription('A `.dx.svg` written by `dx drawing render` or Composer.')),
  },
  handler,
).pipe(
  Command.withDescription('Import a `.dx.svg` into a space as an editable drawing.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
