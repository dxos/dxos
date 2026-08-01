//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Ref, Type } from '@dxos/echo';

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
   * Space-wide kill-switch for trigger execution.
   * When true, the local trigger dispatcher is stopped for the space (no triggers run locally).
   * Per-trigger local/edge routing is controlled by the trigger's `remote` flag.
   */
  triggersDisabled: Schema.optional(Schema.Boolean),

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
export class SpaceProperties extends Type.makeObject<SpaceProperties>(
  DXN.make('org.dxos.type.spaceProperties', '0.1.0'),
)(SpacePropertiesSchema.pipe(Annotation.HiddenAnnotation.set(true))) {}
