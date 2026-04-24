//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Feed, Ref, Type } from '@dxos/echo';

/**
 * Where do triggers get executed.
 */
const ComputeEnvironment = Schema.Literal('local', 'edge');

export const SpacePropertiesSchema = Schema.Struct(
  {
    //
    // System properties.
    //

    archived: Schema.optional(Schema.Boolean.annotations({ title: 'Archive Space' })),
    // TODO(burdon): Change to mode (no booleans?)
    // TODO(wittjosiah): Make optional with default value.
    edgeReplication: Schema.optional(Schema.Boolean),

    /**
     * @deprecated
     */
    invocationTraceFeed: Schema.optional(Ref.Ref(Feed.Feed)),

    /**
     * Preference for trigger execution.
     * *local* - triggers are executed locally on the client, edge is not running triggers.
     * *edge* - triggers are executed on the edge, triggers are not run locally.
     */
    computeEnvironment: Schema.optional(ComputeEnvironment),

    //
    // User properties.
    //

    name: Schema.optional(Schema.String),
    icon: Schema.optional(Schema.String),
    hue: Schema.optional(Schema.String),
  },
  {
    key: Schema.String,
    value: Schema.Any,
  },
);

export type SpacePropertiesSchema = Schema.Schema.Type<typeof SpacePropertiesSchema>;

/** @deprecated Use SpaceProperties instead. */
export const LegacySpaceProperties = SpacePropertiesSchema.pipe(
  Type.object({
    typename: 'org.dxos.type.space-properties',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface LegacySpaceProperties extends Schema.Schema.Type<typeof LegacySpaceProperties> {}

// TODO(burdon): Pipe Schem.optional, or partial to entire struct to make everything optional?
// TODO(burdon): Is separate schema def required for forms? Can it be extracted from SpaceProperties?
export const SpaceProperties = SpacePropertiesSchema.pipe(
  Type.object({
    typename: 'org.dxos.type.spaceProperties',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface SpaceProperties extends Schema.Schema.Type<typeof SpaceProperties> {}
