//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type Space } from '@dxos/client/echo';
import { DSL, DxSvg, SVG_SCHEMA, SvgFile } from '@dxos/diagram';
import { Database, Obj, Ref, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { BaseError } from '@dxos/errors';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { NAME_HEADER, NOT_FOUND_MESSAGE, SHARE_PATH } from '../../functions/share.ts';

/** A file, URL or share could not be read as a drawing. */
export class ImportError extends BaseError.extend('ImportError', 'The drawing could not be imported') {}

/** The query parameters that import a drawing on load (spec F-11.4). */
export type ImportLink = { readonly src?: string; readonly share?: string };

/**
 * A diagram on any other variant as a `.dx.svg` (spec F-11.1): a picture of its scene, the scene as a laid-out SVG
 * drawing, and the scene printed as DSL. Only shapes with a DSL identity are read.
 */
export const toDxSvg = ({
  drawing,
  canvas,
  builder,
}: {
  drawing: Drawing.Drawing;
  canvas: Obj.Unknown;
  builder: IllustratorModel.DrawingBuilder;
}): string => {
  const { scene } = builder.read(canvas);
  const laidOut = Drawing.makeCanvas({ schema: SVG_SCHEMA });
  IllustratorModel.SvgBuilder.apply(
    laidOut,
    IllustratorModel.bindArrowEnds(scene.objects).map((object) => ({ op: 'upsert-object' as const, object })),
  );
  const payload = IllustratorModel.DrawingFile.toPayload({
    drawing: Drawing.make({ name: drawing.name, canvas: laidOut }),
    canvas: laidOut,
    source: { language: 'dsl', text: DSL.print(scene) },
  });
  return IllustratorModel.DrawingFile.toDxSvg(SvgFile.toSvgFile(scene.objects), payload);
};

/** The download's file name, from the drawing's name. */
export const fileName = (drawing: Pick<Drawing.Drawing, 'name'>): string =>
  `${(drawing.name || 'Untitled').replace(/[^\w.-]+/g, '-')}.dx.svg`;

/**
 * Loads the models, layouts and scenes a `Canvas` references, in the order a payload adds them: each one's refs
 * resolve to objects added before it.
 */
export const canvasObjects = async (canvas: Canvas.Canvas): Promise<Obj.Unknown[]> => {
  const [layouts, scenes] = await Promise.all([Ref.loadAll(canvas.layouts), Ref.loadAll(canvas.scenes)]);
  const modelRefs = [canvas.model, ...layouts.map((layout) => Reflect.get(layout, 'model'))].filter(Ref.isRef);
  const models = await Ref.loadAll(modelRefs);
  const unique = new Map([...models, ...layouts, ...scenes].filter(Obj.isObject).map((object) => [object.id, object]));
  return [...unique.values()];
};

/**
 * A `Canvas` diagram as a `.dx.svg` (spec F-11.1): the picture plugin-canvas exports, with the canvas, the objects it
 * references and the drawing embedded as they are, so hand-drawn shapes, which carry no DSL, come back on import.
 */
export const canvasDxSvg = ({
  drawing,
  canvas,
  objects,
  picture,
}: {
  drawing: Drawing.Drawing;
  canvas: Canvas.Canvas;
  objects: readonly Obj.Unknown[];
  picture: string;
}): string => {
  return IllustratorModel.DrawingFile.toDxSvg(picture, {
    format: DxSvg.FORMAT,
    version: 1,
    root: drawing.id,
    objects: [...objects, canvas, drawing].map((object) => Obj.toJSON(object)),
  });
};

const DRAWING_TYPENAME = Type.getTypename(Drawing.Drawing);

/** The `.dx.svg` of a drawing, or undefined when nothing installed can read or picture its canvas. */
const dxSvgOf = async (
  drawing: Drawing.Drawing,
  variants: readonly IllustratorCapabilities.DrawingVariant[],
  exporters: readonly AppCapabilities.Exporter[],
): Promise<string | undefined> => {
  const canvas = await drawing.canvas.load();
  if (Canvas.isCanvas(canvas)) {
    const save = exporters.find(({ id }) => id === DRAWING_TYPENAME)?.save;
    if (!save) {
      return undefined;
    }
    const objects = await canvasObjects(canvas);
    const { content } = await EffectEx.runPromise(save(drawing));
    const picture = typeof content === 'string' ? content : await content.text();
    return canvasDxSvg({ drawing, canvas, objects, picture });
  }
  const variant = IllustratorCapabilities.variantFor(canvas, variants);
  return variant && toDxSvg({ drawing, canvas, builder: variant.builder });
};

/** Downloads the drawing as a `.dx.svg`; false when nothing installed can read or picture its canvas. */
export const downloadDxSvg = async (
  drawing: Drawing.Drawing,
  variants: readonly IllustratorCapabilities.DrawingVariant[],
  exporters: readonly AppCapabilities.Exporter[],
): Promise<boolean> => {
  const svg = await dxSvgOf(drawing, variants, exporters);
  if (svg === undefined) {
    return false;
  }
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName(drawing);
  anchor.click();
  URL.revokeObjectURL(href);
  return true;
};

/** Adds a `.dx.svg`'s drawing to the space under fresh ids. */
export const addDxSvg = Effect.fn('addDxSvg')(function* (space: Space, svg: string) {
  return yield* IllustratorModel.DrawingFile.importDxSvg(svg).pipe(
    Effect.provide(Database.layer(space.db)),
    Effect.mapError((error) => new ImportError({ message: error.message, cause: error })),
  );
});

/** Compiles a shared drawing's DSL into a new laid-out drawing in the space, under fresh ids. */
export const addSource = Effect.fn('addSource')(function* (space: Space, name: string, text: string) {
  const { commands, problems } = yield* DSL.compile(text);
  const errors = problems.filter(({ severity }) => severity === 'error');
  if (errors.length > 0) {
    return yield* Effect.fail(new ImportError({ message: errors.map(({ message }) => message).join('; ') }));
  }
  const canvas = Drawing.makeCanvas({ schema: SVG_SCHEMA });
  IllustratorModel.SvgBuilder.apply(canvas, commands);
  space.db.add(canvas);
  const drawing = space.db.add(Drawing.make({ name, canvas }));
  yield* Effect.promise(() => space.db.flush());
  return drawing;
});

const fetchText = Effect.fn('fetchText')(function* (url: string, what: string) {
  const response = yield* Effect.tryPromise({
    try: () => fetch(url),
    catch: (error) => new ImportError({ message: `Could not fetch ${what}: ${String(error)}`, cause: error }),
  });
  if (response.status === 404 && url.startsWith(SHARE_PATH)) {
    return yield* Effect.fail(new ImportError({ message: NOT_FOUND_MESSAGE }));
  }
  if (!response.ok) {
    return yield* Effect.fail(
      new ImportError({ message: `Could not fetch ${what}: ${response.status} ${response.statusText}` }),
    );
  }
  const text = yield* Effect.tryPromise({
    try: () => response.text(),
    catch: (error) => new ImportError({ message: `Could not read ${what}: ${String(error)}`, cause: error }),
  });
  return { text, name: response.headers.get(NAME_HEADER) ?? undefined };
});

/** Adds the drawing an import link names to the space: the `.dx.svg` at `?src=`, or the share at `?d=`. */
export const addFromLink = Effect.fn('addFromLink')(function* (space: Space, { src, share }: ImportLink) {
  if (share) {
    const { text, name } = yield* fetchText(`${SHARE_PATH}/${encodeURIComponent(share)}`, 'the shared drawing');
    return yield* addSource(space, name ?? 'Shared drawing', text);
  }
  if (src) {
    const { text } = yield* fetchText(src, src);
    return yield* addDxSvg(space, text);
  }
  return yield* Effect.fail(new ImportError({ message: 'The link names no drawing.' }));
});

/** Reads and removes the import parameters, so a reload after editing opens the copy rather than importing again. */
export const takeImportLink = (): ImportLink | undefined => {
  const url = new URL(window.location.href);
  const src = url.searchParams.get('src') ?? undefined;
  const share = url.searchParams.get('d') ?? undefined;
  if (!src && !share) {
    return undefined;
  }
  url.searchParams.delete('src');
  url.searchParams.delete('d');
  window.history.replaceState(window.history.state, '', url);
  return { src, share };
};
