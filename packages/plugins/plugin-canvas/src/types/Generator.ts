//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { type GeneratorSource } from '@dxos/react-ui-canvas/headless';

/** The skill an agent loads to write generators. */
export const SKILL_KEY = 'org.dxos.skill.canvasGenerators';

/**
 * Agent-written code a canvas runs to draw motion no keyframe can express (react-ui-canvas ANIMATION.md §6.6): one
 * TypeScript module whose default export is a generator, its parameter schema, and a version every revision bumps.
 * A `generator` node in a drawing names it by its URI and carries the parameters.
 */
export class Generator extends Type.makeObject<Generator>(DXN.make('org.dxos.type.canvas.generator', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    /** What it draws, for the agent that revises it and the person who places it. */
    description: Schema.String.pipe(Schema.optional),
    /** One TypeScript module; it may import only `@dxos/react-ui-canvas/motion`. */
    source: Schema.String,
    /** JSON schema of the parameters; `x-binding: 'node' | 'link'` marks parameters that name nodes or links. */
    params: Schema.Record(Schema.String, Schema.Any).pipe(Schema.optional),
    /** Bumped on every revision; the canvas recompiles and replays from the nearest earlier time. */
    version: Schema.Number,
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--sparkle--regular', hue: 'violet' })),
) {}

export const make = ({
  version = 1,
  ...props
}: Omit<Obj.MakeProps<typeof Generator>, 'version'> & { version?: number }) =>
  Obj.make(Generator, { ...props, version });

/**
 * The reference a `generator` node stores: the object's fully qualified EID, which reads the same in the operation that
 * placed it and in the view that resolves it.
 */
export const referenceOf = (generator: Generator): string =>
  EID.make({ spaceId: Obj.getDatabase(generator)?.spaceId, entityId: generator.id });

/** What the canvas loads: plain data, so it can cross to the generator worker. */
export const toSource = (generator: Generator): GeneratorSource => ({
  name: generator.name,
  source: generator.source,
  params: generator.params ? JSON.parse(JSON.stringify(generator.params)) : undefined,
  version: generator.version,
});
