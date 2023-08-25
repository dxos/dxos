//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Space } from '@dxos/react-client/echo';

export const SPACE_PLUGIN = 'dxos.org/plugin/space';
export const SPACE_PLUGIN_SHORT_ID = 'space';

const SPACE_ACTION = `${SPACE_PLUGIN}/action`;
export enum SpaceAction {
  CREATE = `${SPACE_ACTION}/create`,
  JOIN = `${SPACE_ACTION}/join`,
  SHARE = `${SPACE_ACTION}/share`,
  RENAME = `${SPACE_ACTION}/rename`,
  CLOSE = `${SPACE_ACTION}/close`,
  BACKUP = `${SPACE_ACTION}/backup`,
  RESTORE = `${SPACE_ACTION}/restore`,
  ADD_OBJECT = `${SPACE_ACTION}/add-object`,
  REMOVE_OBJECT = `${SPACE_ACTION}/remove-object`,
  RENAME_OBJECT = `${SPACE_ACTION}/rename-object`,
}

export type SpaceState = {
  current: Space | undefined;
};

export type SpacePluginProvides = GraphProvides &
  IntentProvides &
  TranslationsProvides & {
    space: SpaceState;
  };
