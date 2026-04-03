//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type PublicKey } from '@dxos/client';
import { Database, Obj } from '@dxos/echo';
import { Collection } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type ComplexMap } from '@dxos/util';

import { meta } from '../meta';

export { SpaceSettingsSchema, type SpaceSettingsProps } from './Settings';

export const SPACE_DIRECTORY_HANDLE = `${meta.id}.directory`;

export const SPACE_TYPE = 'org.dxos.type.space';

/** Key for the Expando that stores cross-space ordering (must stay stable for persisted data). */
export const SHARED = 'shared-spaces';

export type SpacePluginOptions = {
  /**
   * Origin used for shareable links (object copy-link and invitation base).
   * Defaults to window.location.origin.
   */
  shareableLinkOrigin?: string;

  /**
   * Path appended to shareableLinkOrigin to form the invitation base URL.
   * Defaults to '/'.
   */
  invitationPath?: string;

  /**
   * Query parameter name for the invitation code.
   */
  invitationProp?: string;

  /**
   * Whether to send observability events.
   */
  observability?: boolean;
};

export type ObjectViewerProps = {
  lastSeen: number;
  currentlyAttended: boolean;
};

export type ObjectId = string;

export type PluginState = {
  /**
   * Which objects are currently being viewed by which peers.
   */
  viewersByObject: Record<ObjectId, ComplexMap<PublicKey, ObjectViewerProps>>;

  /**
   * Which peers are currently viewing which objects.
   */
  viewersByIdentity: ComplexMap<PublicKey, Set<ObjectId>>;

  /**
   * Object that was linked to directly but not found and is being awaited.
   */
  awaiting: string | undefined;

  /**
   * Cached space names, used when spaces are closed or loading.
   */
  spaceNames: Record<string, string>;

  /**
   * Which spaces have an SDK migration running currently.
   */
  // TODO(wittjosiah): Factor out to sdk. Migration running should probably be a space state.
  sdkMigrationRunning: Record<string, boolean>;

  /**
   * Whether or not the user can navigate to collections in the graph.
   * Determined by whether or not there is an available plugin that can render a collection.
   */
  navigableCollections: boolean;

  /**
   * Tracks whether setting edge replication as default has been run on spaces.
   */
  // TODO(wittjosiah): Systematic way to handle migrations of state outside of spaces.
  enabledEdgeReplication: boolean;
};

// TODO(wittjosiah): Reconcile with graph export serializers.

export type SerializerMap = Record<string, TypedObjectSerializer>;

export interface TypedObjectSerializer<T extends Obj.Unknown = Obj.Unknown> {
  serialize(params: { object: T }): Promise<string>;

  /**
   * @param params.content
   * @param params.space Space to use for deserializing schema references.
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: { content: string; db: Database.Database; newId?: boolean }): Promise<T>;
}

/**
 * Result of creating and adding an object.
 */
export type CreateObjectResult = {
  id: string;
  subject: readonly string[];
  object: Obj.Unknown;
};

/**
 * Factory function that creates an object and adds it to a target (database or collection).
 * Returns an Effect that resolves to the created object result with navigation subject.
 */
export type CreateObject = (
  props: any,
  options: {
    db: Database.Database;
    target: Database.Database | Collection.Collection;
    targetNodeId?: string;
  },
) => Effect.Effect<CreateObjectResult, Error, Capability.Service | Operation.Service>;

// TODO(burdon): Move to FormatEnum or SDK.
export const IconAnnotationId = Symbol.for('@dxos/plugin-space/annotation/Icon');
export const HueAnnotationId = Symbol.for('@dxos/plugin-space/annotation/Hue');

// TOOD(burdon): Use SpacePropertiesSchema.
export const SpaceForm = Schema.Struct({
  name: Schema.optional(Schema.String.annotations({ title: 'Name' })),
  icon: Schema.optional(Schema.String.annotations({ title: 'Icon', [IconAnnotationId]: true })),
  hue: Schema.optional(Schema.String.annotations({ title: 'Color', [HueAnnotationId]: true })),
  edgeReplication: Schema.optional(Schema.Boolean.annotations({ title: 'Enable EDGE Replication' })),
});
