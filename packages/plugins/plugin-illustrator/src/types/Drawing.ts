//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CardAnnotation } from '@dxos/schema';

/**
 * Canvas content shared by every renderer: an opaque map of record id → record, managed by the
 * renderer's store adapter and CRDT-merged by ECHO without knowing its shape. `schema` identifies
 * the renderer dialect (e.g. `tldraw.com/2`, `excalidraw.com/2`) and is how a `Drawing` is matched
 * to the variant that can render it.
 *
 * Hidden: reached through `Drawing.canvas`, never listed on its own.
 */
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.canvas', '0.1.0'))(
  Schema.Struct({
    /** Content version of `content` and `styles`; content migrations (`Migration.defineContent`) key on it. */
    schema: Schema.String.pipe(
      Annotation.ContentVersionAnnotation.set({ fields: ['content', 'styles'] }),
      Schema.optional,
    ),
    /** Diagram parts by id. */
    content: Schema.Record(Schema.String, Schema.Any),
    /** Named looks the parts share, by id; opaque here like `content`, managed by the renderer's store adapter. */
    styles: Schema.Record(Schema.String, Schema.Any).pipe(Schema.optional),
  }),
) {}

export type MakeCanvasOptions = Omit<Partial<Obj.MakeProps<typeof Canvas>>, 'schema'> & {
  /** Required at construction: matches the canvas to a renderer variant. */
  schema: string;
};

/** Creates a {@link Canvas} for the given renderer schema. */
export const makeCanvas = ({ schema, content = {} }: MakeCanvasOptions): Canvas =>
  Obj.make(Canvas, { schema, content });

/**
 * The format a canvas `schema` names, without its revision (`dxos.org/scene/2` → `dxos.org/scene`); a schema with
 * no trailing revision is its own format.
 */
export const getFormat = (schema: string): string => schema.replace(/\/\d+$/, '');

/** Whether two canvas schemas name the same format, at any revision; how a canvas is matched to its variant. */
export const isSameFormat = (left: string, right: string): boolean => getFormat(left) === getFormat(right);

/** Type guard for {@link Canvas} objects. */
export const isCanvas = (object: unknown): object is Canvas => Obj.instanceOf(Canvas, object);

/**
 * Base Drawing object. Renderer-specific behaviour lives in the variant that claims the canvas's
 * `schema`, so all renderers (tldraw, excalidraw, ...) share one typename, graph node, create
 * flow, and surface scaffolding.
 */
/** The drawing skill, declared on the type so binding a drawing to a chat gives the agent its tools. */
export const SKILL_KEY = 'org.dxos.skill.drawing';

export class Drawing extends Type.makeObject<Drawing>(DXN.make('org.dxos.type.drawing', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    canvas: Ref.Ref(Canvas)
      .annotate({ description: 'Reference to the canvas holding the renderer-specific content.' })
      .pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--compass-tool--regular', hue: 'indigo' }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    CardAnnotation.set(true),
    Annotation.UserType.set({ tags: [Collection.ItemTag] }),
  ),
) {}

/**
 * Build a `Drawing` referencing the given canvas.
 *
 * @param name Optional display name shown in the graph node and Properties form.
 * @param canvas Canvas holding the renderer's content.
 */
export const make = ({ name, canvas }: { name?: string; canvas: Canvas }): Drawing =>
  Obj.make(Drawing, { name, canvas: Ref.make(canvas) });

/** Type guard for {@link Drawing} objects. */
export const isDrawing = (object: unknown): object is Drawing => Obj.instanceOf(Drawing, object);
