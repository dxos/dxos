//
// Copyright 2023 DXOS.org
//

export const SPACE_PLUGIN = 'dxos:space';

export enum SpaceAction {
  CREATE = `${SPACE_PLUGIN}/create`,
  JOIN = `${SPACE_PLUGIN}/join`,
  SHARE = `${SPACE_PLUGIN}/share`,
  RENAME = `${SPACE_PLUGIN}/rename`,
  HIDE = `${SPACE_PLUGIN}/hide`,
  BACKUP = `${SPACE_PLUGIN}/backup`,
  RESTORE = `${SPACE_PLUGIN}/restore`,
  ADD_OBJECT = `${SPACE_PLUGIN}/add-object`,
  REMOVE_OBJECT = `${SPACE_PLUGIN}/remove-object`,
}
