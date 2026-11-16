//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Feed, Ref, Type } from '@dxos/echo';

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
   * Plugins this space runs, by plugin NSID (`org.dxos.plugin.thread`), each mapped to the semver
   * range the space accepts. The range, not a pin: a space states what it is compatible with and the
   * registry picks the newest published version inside it, so a patch release reaches every space
   * without a write to each one.
   *
   * Core rather than a setting: it decides which types exist, which operations resolve and which
   * version of each runs, for every member and for EDGE alike. An absent or empty map is a space
   * that names no plugins, so each member runs their own set and EDGE falls back to the deployment's
   * list; there is no way to say "this space runs nothing", which would mean a space that can do
   * nothing.
   */
  plugins: Schema.optional(Schema.Record(Schema.String, Schema.String)),

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
)(SpacePropertiesSchema) {}
