//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type PublicKey } from '@dxos/react-client';
import { type ComplexMap } from '@dxos/util';

import { SPACE_PLUGIN } from './meta';

export const SPACE_DIRECTORY_HANDLE = 'dxos.org/plugin/space/directory';

const SPACE_ACTION = `${SPACE_PLUGIN}/action`;
export enum SpaceAction {
  CREATE = `${SPACE_ACTION}/create`,
  JOIN = `${SPACE_ACTION}/join`,
  SHARE = `${SPACE_ACTION}/share`,
  RENAME = `${SPACE_ACTION}/rename`,
  OPEN = `${SPACE_ACTION}/open`,
  CLOSE = `${SPACE_ACTION}/close`,
  MIGRATE = `${SPACE_ACTION}/migrate`,
  SAVE = `${SPACE_ACTION}/save`,
  LOAD = `${SPACE_ACTION}/load`,
  ADD_OBJECT = `${SPACE_ACTION}/add-object`,
  REMOVE_OBJECT = `${SPACE_ACTION}/remove-object`,
  RENAME_OBJECT = `${SPACE_ACTION}/rename-object`,
  DUPLICATE_OBJECT = `${SPACE_ACTION}/duplicate-object`,
  WAIT_FOR_OBJECT = `${SPACE_ACTION}/wait-for-object`,
  TOGGLE_HIDDEN = `${SPACE_ACTION}/toggle-hidden`,
  SELECT_DIRECTORY = `${SPACE_ACTION}/select-directory`,

  /**
   * @deprecated Temporary action to help with composer performance.
   */
  // TODO(wittjosiah): Replace with `OPEN`?
  ENABLE = `${SPACE_ACTION}/enable`,
}

export type ObjectViewerProps = {
  lastSeen: number;
  spaceKey: PublicKey;
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
   * Spaces which have been touched by the user and should have queries run against them.
   *
   * @deprecated Temporary action to help with composer performance.
   */
  // TODO(wittjosiah): Move state into space?
  enabled: PublicKey[];
};

export type SpaceSettingsProps = { showHidden?: boolean };

export type SpacePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<SpaceSettingsProps> &
  TranslationsProvides &
  SchemaProvides & {
    space: Readonly<PluginState>;
  };
