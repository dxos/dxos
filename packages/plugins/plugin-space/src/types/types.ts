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
  Plugin,
} from '@dxos/app-framework';
import { type Expando } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-client';
import { type PanelProvides } from '@dxos/plugin-deck/types';
import { type PublicKey } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type Label } from '@dxos/react-ui';
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

  /**
   * Whether or not the user can select collections in the graph.
   * Determined by whether or not there is an available plugin that can render a collection.
   */
  selectableCollections: boolean;
};

export type SpaceSettingsProps = {
  /**
   * Show closed spaces.
   */
  showHidden?: boolean;

  /**
   * Action to perform when a space is created.
   */
  onSpaceCreate?: string;
};

export type SpaceInitProvides = {
  space: {
    onSpaceCreate: {
      label: Label;
      action: string;
    };
  };
};

export const parseSpaceInitPlugin = (plugin: Plugin) =>
  typeof (plugin.provides as any).space?.onSpaceCreate === 'object' ? (plugin as Plugin<SpaceInitProvides>) : undefined;

export type SpacePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  SettingsProvides<SpaceSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  PanelProvides & {
    space: Readonly<PluginState>;
  };

// TODO(wittjosiah): Reconcile with graph export serializers.

export type SerializerMap = Record<string, TypedObjectSerializer>;

export interface TypedObjectSerializer<T extends Expando = Expando> {
  serialize(params: { object: T }): Promise<string>;

  /**
   * @param params.content
   * @param params.space Space to use for deserializing schema references.
   * @param params.newId Generate new ID for deserialized object.
   */
  deserialize(params: { content: string; space: Space; newId?: boolean }): Promise<T>;
}
