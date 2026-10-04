//
// Copyright 2026 DXOS.org
//

//
// The illustrator's `.dx.svg`: the drawing rendered as SVG, carrying its `Drawing` and `Canvas` ECHO
// objects as a `.dx.json` payload (`DxSvg` in `@dxos/diagram` owns the container), so the picture can be
// opened as an image anywhere and imported back as an editable drawing.
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { DxSvg } from '@dxos/diagram';
import { Database, Obj } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { EntityId } from '@dxos/keys';

import { Drawing } from '#types';

/** The diagram source the scene was compiled from, kept so it can be laid out again. */
export type Source = { readonly language: 'mermaid' | 'uml' | 'dsl'; readonly text: string };

/** A `.dx.json` (`objects`, `version`) plus the container format, the object to open, and the source. */
export const Payload = Schema.Struct({
  format: Schema.Literal(DxSvg.FORMAT),
  version: Schema.Literal(1),
  timestamp: Schema.optional(Schema.String),
  root: Schema.String,
  objects: Schema.Array(Schema.Record(Schema.String, Schema.Unknown)),
  source: Schema.optional(Schema.Struct({ language: Schema.Literals(['mermaid', 'uml', 'dsl']), text: Schema.String })),
});

export type Payload = Schema.Schema.Type<typeof Payload>;

/** The payload for a drawing: its canvas first, so the drawing's ref resolves when they are added in order. */
export const toPayload = ({
  drawing,
  canvas,
  source,
}: {
  drawing: Drawing.Drawing;
  canvas: Drawing.Canvas;
  source?: Source;
}): Payload => ({
  format: DxSvg.FORMAT,
  version: 1,
  timestamp: new Date().toISOString(),
  root: drawing.id,
  objects: [Obj.toJSON(canvas), Obj.toJSON(drawing)],
  ...(source ? { source } : {}),
});

/** A standalone SVG of the drawing with its objects embedded. */
export const toDxSvg = (svg: string, payload: Payload): string => DxSvg.embed(svg, payload);

/**
 * The payload with every object given a fresh id and every reference to one rewritten, so importing the
 * same file twice adds two drawings rather than colliding on ids.
 */
export const remapIds = (payload: Payload): Payload => {
  const ids = new Map(payload.objects.map(({ id }) => [String(id), EntityId.random()]));
  const rewrite = (value: unknown): unknown => {
    if (typeof value === 'string') {
      // Local refs serialize as `echo:///<id>` and cross-space ones as `echo://<space>/<id>`; only ids in this file move.
      return value.replace(/(echo:\/[^"\s]*\/)([0-9A-Z]{26})\b/g, (match, prefix: string, id: string) =>
        ids.has(id) ? `${prefix}${ids.get(id)}` : match,
      );
    }
    if (Array.isArray(value)) {
      return value.map(rewrite);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewrite(entry)]));
    }
    return value;
  };
  return {
    ...payload,
    root: ids.get(payload.root) ?? payload.root,
    objects: payload.objects.map((object) => {
      const rewritten = rewrite(object);
      return {
        ...(rewritten && typeof rewritten === 'object' ? rewritten : {}),
        id: ids.get(String(object.id)) ?? object.id,
      };
    }),
  };
};

/** The payload of a `.dx.svg`, or undefined for a plain SVG. */
export const fromDxSvg = (svg: string): Effect.Effect<Payload | undefined, Schema.SchemaError> => {
  const payload = DxSvg.extract(svg);
  return payload === undefined ? Effect.succeed(undefined) : Schema.decodeUnknownEffect(Payload)(payload);
};

/** The SVG cannot be imported as a drawing. */
export class ImportError extends BaseError.extend(
  'DrawingFileImportError',
  'The SVG cannot be imported as a drawing.',
) {}

/** Adds a `.dx.svg`'s objects to the database under fresh ids and returns the drawing to open. */
export const importDxSvg = Effect.fn('DrawingFile.importDxSvg')(function* (svg: string) {
  const payload = yield* fromDxSvg(svg);
  if (!payload) {
    return yield* Effect.fail(new ImportError({ message: 'Not a .dx.svg: the SVG carries no DXOS payload.' }));
  }
  const { db } = yield* Database.Service;
  const { root, objects } = remapIds(payload);
  const resolver = db.graph.createRefResolver({ context: { space: db.spaceId } });
  // Decode everything before adding anything, so a bad payload leaves the space untouched.
  const decoded = yield* Effect.forEach(objects, (json) =>
    Effect.promise(() => Obj.fromJSON(json, { refResolver: resolver })),
  );
  const drawing = decoded.find((object) => object.id === root);
  if (!drawing || !Drawing.isDrawing(drawing)) {
    return yield* Effect.fail(new ImportError({ message: 'The .dx.svg payload has no drawing at its root.' }));
  }
  decoded.forEach((object) => db.add(object));
  yield* Effect.promise(() => db.flush());
  return drawing;
});
