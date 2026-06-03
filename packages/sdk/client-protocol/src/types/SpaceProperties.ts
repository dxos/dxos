//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Collection, DXN, Feed, Ref, Type } from '@dxos/echo';

/**
 * Where do triggers get executed.
 */
export const ComputeEnvironment = Schema.Literal('disabled', 'local', 'edge');
export type ComputeEnvironment = Schema.Schema.Type<typeof ComputeEnvironment>;

export const SpacePropertiesSchema = Schema.Struct({
  //
  // System properties.
  //

  // TODO(burdon): Change to mode (no booleans?)
  // TODO(wittjosiah): Make optional with default value.
  edgeReplication: Schema.optional(Schema.Boolean),

  /**
   * @deprecated
   */
  invocationTraceFeed: Schema.optional(Ref.Ref(Feed.Feed)),

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
  description: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  iconHue: Schema.optional(Schema.String),
  hue: Schema.optional(Schema.String),
});

export type SpacePropertiesSchema = Schema.Schema.Type<typeof SpacePropertiesSchema>;

// TODO(burdon): Pipe Schem.optional, or partial to entire struct to make everything optional?
// TODO(burdon): Is separate schema def required for forms? Can it be extracted from SpaceProperties?
export const SpaceProperties = SpacePropertiesSchema.pipe(
  Annotation.HiddenAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.spaceProperties', '0.1.0')),
);

export type SpaceProperties = Type.InstanceType<typeof SpaceProperties>;

/** Root navigation collection for a space. */
export const RootCollectionAnnotation = Annotation.make({
  id: 'org.dxos.space.rootCollection',
  schema: Ref.Ref(Collection.Collection),
});
