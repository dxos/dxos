//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import type { PublicKey } from '@dxos/react-client';
import type { ItemID } from '@dxos/react-client/echo';

import { SPACE_PLUGIN } from './meta';

const SPACE_ACTION = `${SPACE_PLUGIN}/action`;
export enum SpaceAction {
  CREATE = `${SPACE_ACTION}/create`,
  JOIN = `${SPACE_ACTION}/join`,
  SHARE = `${SPACE_ACTION}/share`,
  RENAME = `${SPACE_ACTION}/rename`,
  OPEN = `${SPACE_ACTION}/open`,
  CLOSE = `${SPACE_ACTION}/close`,
  BACKUP = `${SPACE_ACTION}/backup`,
  RESTORE = `${SPACE_ACTION}/restore`,
  ADD_OBJECT = `${SPACE_ACTION}/add-object`,
  REMOVE_OBJECT = `${SPACE_ACTION}/remove-object`,
  RENAME_OBJECT = `${SPACE_ACTION}/rename-object`,
  WAIT_FOR_OBJECT = `${SPACE_ACTION}/wait-for-object`,
  ADD_TO_FOLDER = `${SPACE_ACTION}/add-to-folder`,
  REMOVE_FROM_FOLDER = `${SPACE_ACTION}/remove-from-folder`,
  TOGGLE_HIDDEN = `${SPACE_ACTION}/toggle-hidden`,
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
  TranslationsProvides & {
    settings: Readonly<SpaceSettingsProps>;
    space: Readonly<PluginState>;
  };
