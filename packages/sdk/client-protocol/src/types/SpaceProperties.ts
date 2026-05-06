//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Ref, Type } from '@dxos/echo';

/**
 * Where do triggers get executed.
 */
export const ComputeEnvironment = Schema.Literal('disabled', 'local', 'edge');
export type ComputeEnvironment = Schema.Schema.Type<typeof ComputeEnvironment>;

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
    invocationTraceFeed: Schema.optional(Schema.Any),

    /**
     * Preference for trigger execution.
     * *disabled* - triggers do not run locally or on EDGE.
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

/**
 * Explicit instance shape for space properties, mirroring SpacePropertiesSchema fields.
 * Used by SpaceProperties and LegacySpaceProperties interfaces instead of the inferred
 * `Schema.Schema.Type<typeof SpaceProperties>` pattern, which collapses to `any` in
 * rolldown-plugin-dts bundled chunk output when the value type uses external workspace types.
 */
export type SpacePropertiesInstance = {
  readonly [key: string]: any;
  readonly archived?: boolean;
  readonly edgeReplication?: boolean;
  /** @deprecated */
  readonly invocationTraceFeed?: any;
  readonly computeEnvironment?: 'disabled' | 'local' | 'edge';
  readonly name?: string;
  readonly icon?: string;
  readonly hue?: string;
};

/** @deprecated Use SpaceProperties instead. */
export const LegacySpaceProperties: Type.Obj<SpacePropertiesInstance> = SpacePropertiesSchema.pipe(
  Type.object({
    typename: 'org.dxos.type.space-properties',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface LegacySpaceProperties extends SpacePropertiesInstance {}

// TODO(burdon): Pipe Schem.optional, or partial to entire struct to make everything optional?
// TODO(burdon): Is separate schema def required for forms? Can it be extracted from SpaceProperties?
export const SpaceProperties: Type.Obj<SpacePropertiesInstance> = SpacePropertiesSchema.pipe(
  Type.object({
    typename: 'org.dxos.type.spaceProperties',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface SpaceProperties extends SpacePropertiesInstance {}
