//
// Copyright 2023 DXOS.org
//

export const SPACE_PLUGIN = 'dxos.org/plugin/space';
export const SPACE_PLUGIN_SHORT_ID = 'space';

export default {
  id: SPACE_PLUGIN,
  shortId: SPACE_PLUGIN_SHORT_ID,
  name: 'Spaces',
};

const SPACE_ACTION = `${SPACE_PLUGIN}/action`;
export enum SpaceAction {
  CREATE = `${SPACE_ACTION}/create`,
  JOIN = `${SPACE_ACTION}/join`,
  SHARE = `${SPACE_ACTION}/share`,
  LOCK = `${SPACE_ACTION}/lock`,
  UNLOCK = `${SPACE_ACTION}/unlock`,
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
}
