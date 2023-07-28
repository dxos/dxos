//
// Copyright 2023 DXOS.org
//

export const SPACE_PLUGIN = 'dxos.org/plugin/space';
export const SPACE_PLUGIN_SHORT_ID = 'space';

const SPACE_ACTION = `${SPACE_PLUGIN}/action`;
export enum SpaceAction {
  CREATE = `${SPACE_ACTION}/create`,
  JOIN = `${SPACE_ACTION}/join`,
  SHARE = `${SPACE_ACTION}/share`,
  RENAME = `${SPACE_ACTION}/rename`,
  HIDE = `${SPACE_ACTION}/hide`,
  BACKUP = `${SPACE_ACTION}/backup`,
  RESTORE = `${SPACE_ACTION}/restore`,
  ADD_OBJECT = `${SPACE_ACTION}/add-object`,
  REMOVE_OBJECT = `${SPACE_ACTION}/remove-object`,
}
