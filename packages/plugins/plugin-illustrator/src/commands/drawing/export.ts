//
// Copyright 2026 DXOS.org
//

import * as Args from 'effect/cli/Argument';
import * as Command from 'effect/cli/Command';
import * as Options from 'effect/cli/Flag';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Option from 'effect/Option';

import { CommandConfig, Common, FormBuilder, formatBytes, print, spaceLayer } from '@dxos/cli-util';
import { SVG_SCHEMA, SvgFile } from '@dxos/diagram';
import { Database, Filter, Obj } from '@dxos/echo';

import { DrawingFile, SvgBuilder } from '#model';
import { Drawing } from '#types';

import { ExportError } from './util.ts';

export type ExportArgs = { id: string; out: Option.Option<string> };

/** Writes a drawing as it stands in the space, edits included, to a `.dx.svg`. */
export const handler = Effect.fn(function* ({ id, out }: ExportArgs) {
  const { json } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;

  const [drawing] = (yield* Database.query(Filter.type(Drawing.Drawing)).run).filter(
    (candidate) => candidate.id === id,
  );
  if (!drawing) {
    return yield* Effect.fail(new ExportError({ message: `No drawing ${id} in the space.` }));
  }
  const canvas = yield* Database.load(drawing.canvas);
  if (!Drawing.isCanvas(canvas) || canvas.schema !== SVG_SCHEMA) {
    const format = Drawing.isCanvas(canvas) ? canvas.schema : Obj.getTypename(canvas);
    return yield* Effect.fail(new ExportError({ message: `Only SVG drawings export; this one is ${format}.` }));
  }

  const { scene } = SvgBuilder.read(canvas);
  const svg = DrawingFile.toDxSvg(SvgFile.toSvgFile(scene.objects), DrawingFile.toPayload({ drawing, canvas }));
  const target = Option.getOrElse(out, () => `${(drawing.name ?? drawing.id).replace(/[^\w.-]+/g, '-')}.dx.svg`);
  yield* fs.writeFileString(target, svg);

  if (json) {
    yield* Console.log(JSON.stringify({ id, file: target }, null, 2));
  } else {
    const builder = FormBuilder.make({ title: drawing.name ?? 'Drawing' }).pipe(
      FormBuilder.set('file', target),
      FormBuilder.set('size', formatBytes(new TextEncoder().encode(svg).byteLength)),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
  }
});

export const exportDrawing = Command.make(
  'export',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: Args.String('id').pipe(Args.withDescription('Drawing id, as `dx drawing list` prints it.')),
    out: Options.String('out').pipe(
      Options.withAlias('o'),
      Options.withDescription('Output path; defaults to `<name>.dx.svg`.'),
      Options.optional,
    ),
  },
  handler,
).pipe(
  Command.withDescription('Export a drawing from a space to a `.dx.svg`.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
