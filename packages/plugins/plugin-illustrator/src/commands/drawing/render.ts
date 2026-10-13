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
import * as Path from 'effect/Path';

import { CommandConfig, FormBuilder, formatBytes, print } from '@dxos/cli-util';
import { Diagnostics, Dsl, type Scene } from '@dxos/diagram';

import { DrawingFile, toSvgFile } from '#model';

import { RenderError } from './util.ts';

/** The picture with the drawing and its DSL source embedded, so it imports back as an editable drawing. */
const toDxSvg = ({
  name,
  source,
  commands,
  objects,
}: {
  name: string;
  source: string;
  commands: readonly Scene.Command[];
  objects: readonly Scene.WorldObject[];
}): string => {
  const sourceText = { language: 'dsl', text: source } as const;
  const { drawing, canvas } = DrawingFile.makeDrawing({ name, commands, source: sourceText });
  return DrawingFile.toDxSvg(toSvgFile(objects), DrawingFile.toPayload({ drawing, canvas, source: sourceText }));
};

export type RenderArgs = {
  file: string;
  out: Option.Option<string>;
  plain: boolean;
};

/** Compiles a `.dx` file, lays it out and writes it as a `.dx.svg` (or a bare `.svg` with `plain`). */
export const handler = Effect.fn(function* ({ file, out, plain }: RenderArgs) {
  const { json } = yield* CommandConfig;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const source = yield* fs.readFileString(file);
  const name = path.basename(file).replace(/\.dx$/, '');
  const { commands, problems } = yield* Dsl.compile(source);
  if (problems.some(({ severity }) => severity === 'error')) {
    return yield* Effect.fail(
      new RenderError({ message: problems.map(({ severity, message }) => `${severity}: ${message}`).join('\n') }),
    );
  }

  const objects = Dsl.toScene(commands).objects;
  const report = Diagnostics.analyze(objects);
  const svg = plain ? toSvgFile(objects) : toDxSvg({ name, source, commands, objects });
  const target = Option.getOrElse(out, () => path.join(path.dirname(file), `${name}${plain ? '.svg' : '.dx.svg'}`));
  yield* fs.writeFileString(target, svg);

  const { nodes, connectors, crossings, bends } = report.metrics;
  const notes = [...problems, ...report.diagnostics].map(({ severity, message }) => `${severity}: ${message}`);
  if (json) {
    yield* Console.log(JSON.stringify({ file: target, nodes, connectors, crossings, bends, notes }, null, 2));
  } else {
    const builder = FormBuilder.make({ title: name }).pipe(
      FormBuilder.set('nodes', nodes),
      FormBuilder.set('connectors', connectors),
      FormBuilder.set('crossings', crossings),
      FormBuilder.set('bends', bends),
      FormBuilder.set('file', path.relative(process.cwd(), target) || target),
      FormBuilder.set('size', formatBytes(svg.length)),
    );
    yield* Console.log(print(FormBuilder.build(builder)));
    for (const note of notes) {
      yield* Console.log(`  ${note}`);
    }
  }
});

export const render = Command.make(
  'render',
  {
    file: Args.File('file').pipe(Args.withDescription('Diagram in the semantic DSL (`.dx`).')),
    out: Options.String('out').pipe(
      Options.withAlias('o'),
      Options.withDescription('Output path; defaults to `<name>.dx.svg` beside the source.'),
      Options.optional,
    ),
    plain: Options.Boolean('plain').pipe(
      Options.withDescription('Write a bare `.svg` without the embedded drawing and source.'),
      Options.withDefault(false),
    ),
  },
  handler,
).pipe(Command.withDescription('Lay out a `.dx` diagram and write it as an SVG that imports back as a drawing.'));
