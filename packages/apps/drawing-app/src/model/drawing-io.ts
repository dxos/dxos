//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Dsl, SvgFile } from '@dxos/diagram';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

/** The diagram a first run opens: small enough to read at a glance, with arrows to drag boxes against. */
export const STARTER_SOURCE = `diagram aspect=16:9
node Idea "Idea"
node Sketch "Sketch" right-of Idea
node Share "Share" right-of Sketch
node Edit "Edit on a canvas" below Sketch
edge Idea -> Sketch "write .dx"
edge Sketch -> Share "drawing.sh"
edge Sketch -> Edit "drag boxes"
edge Edit -> Share "download .dx.svg"
`;

/** The DSL source did not compile. */
export class CompileError extends Error {
  readonly _tag = 'CompileError';
}

/** Compiles semantic DSL into an SVG drawing and its canvas, not yet added to a space. */
export const compileDrawing = Effect.fn('compileDrawing')(function* (name: string, text: string) {
  const { commands, problems } = yield* Dsl.compile(text);
  const errors = problems.filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    return yield* Effect.fail(new CompileError(errors.map(({ message }) => message).join('; ')));
  }
  return IllustratorModel.DrawingFile.makeDrawing({ name, commands, source: { language: 'dsl', text } });
});

/**
 * The drawing as a `.dx.svg`: the picture rendered from the variant's scene, the ECHO objects so Composer
 * reopens it as it stands, and the scene printed back to DSL so `drawing source` reads the edited layout.
 */
export const toDxSvg = ({
  drawing,
  canvas,
  builder,
}: {
  drawing: Drawing.Drawing;
  canvas: Drawing.Canvas;
  builder: IllustratorModel.DrawingBuilder;
}): string => {
  const { scene } = builder.read(canvas);
  const svg = SvgFile.toSvgFile(scene.objects);
  const source = { language: 'dsl' as const, text: Dsl.print(scene) };
  return IllustratorModel.DrawingFile.toDxSvg(svg, IllustratorModel.DrawingFile.toPayload({ drawing, canvas, source }));
};

/** A file name for the download, from the drawing's name. */
export const fileName = (drawing: Pick<Drawing.Drawing, 'id' | 'name'>): string =>
  `${(drawing.name || 'drawing').replace(/[^\w.-]+/g, '-')}.dx.svg`;
