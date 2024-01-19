//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import type { PublicKey } from '@dxos/react-client';
import type { ItemID } from '@dxos/react-client/echo';

import { SPACE_PLUGIN } from './meta';

export const SPACE_DIRECTORY_HANDLE = 'dxos.org/spaces/dir-handle';

const SPACE_ACTION = `${SPACE_PLUGIN}/action`;
export enum SpaceAction {
  CREATE = `${SPACE_ACTION}/create`,
  JOIN = `${SPACE_ACTION}/join`,
  SHARE = `${SPACE_ACTION}/share`,
  RENAME = `${SPACE_ACTION}/rename`,
  OPEN = `${SPACE_ACTION}/open`,
  CLOSE = `${SPACE_ACTION}/close`,
  MIGRATE = `${SPACE_ACTION}/migrate`,
  EXPORT = `${SPACE_ACTION}/export`,
  IMPORT = `${SPACE_ACTION}/import`,
  ADD_OBJECT = `${SPACE_ACTION}/add-object`,
  REMOVE_OBJECT = `${SPACE_ACTION}/remove-object`,
  RENAME_OBJECT = `${SPACE_ACTION}/rename-object`,
  SAVE_TO_DISK = `${SPACE_ACTION}/save-to-disk`,
  LOAD_FROM_DISK = `${SPACE_ACTION}/load-from-disk`,
  WAIT_FOR_OBJECT = `${SPACE_ACTION}/wait-for-object`,
  TOGGLE_HIDDEN = `${SPACE_ACTION}/toggle-hidden`,
  SELECT_DIRECTORY = `${SPACE_ACTION}/select-directory`,
}

export type ObjectViewer = {
  identityKey: PublicKey;
  spaceKey: PublicKey;
  objectId: string;
  lastSeen: number;
};

export type PluginState = {
  /**
   * Which objects peers are currently viewing.
   */
  viewers: ObjectViewer[];

  /**
   * Object that was linked to directly but not found and is being awaited.
   */
  awaiting: ItemID | undefined;
};

export type SpaceSettingsProps = { showHidden?: boolean };

export type SpacePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<SpaceSettingsProps> &
  TranslationsProvides & {
    space: Readonly<PluginState>;
  };
