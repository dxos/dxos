//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  GraphSerializerProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type Expando } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-client';
import { type PublicKey } from '@dxos/react-client';
import { type ComplexMap } from '@dxos/util';

export const SPACE_DIRECTORY_HANDLE = 'dxos.org/plugin/space/directory';

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
};

export type SpaceSettingsProps = { showHidden?: boolean };

export type SpacePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  SettingsProvides<SpaceSettingsProps> &
  TranslationsProvides &
  SchemaProvides & {
    space: Readonly<PluginState>;
  };

// TODO(wittjosiah): Reconcile with graph export serializers.

export type SerializerMap = Record<string, TypedObjectSerializer>;

export interface TypedObjectSerializer<T extends Expando = Expando> {
  serialize(params: { object: T }): Promise<string>;

  /**
   * @param params.content
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: { content: string; newId?: boolean }): Promise<T>;
}
