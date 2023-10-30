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

export const SPACE_PLUGIN = 'dxos.org/plugin/space';
export const SPACE_PLUGIN_SHORT_ID = 'space';

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
  ADD_TO_FOLDER = `${SPACE_ACTION}/add-to-folder`,
  REMOVE_FROM_FOLDER = `${SPACE_ACTION}/remove-from-folder`,
}

export type ObjectViewer = {
  identityKey: PublicKey;
  spaceKey: PublicKey;
  objectId: string;
  lastSeen: number;
};

/**
 * The state of the space plugin.
 */
export type PluginState = {
  /**
   * Which objects peers are currently viewing.
   */
  viewers: ObjectViewer[];
};

export type SpaceSettingsProps = { showHidden?: boolean };

export type SpacePluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  GraphBuilderProvides &
  TranslationsProvides & {
    settings: Readonly<SpaceSettingsProps>;
    space: Readonly<PluginState>;
  };
