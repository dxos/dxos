//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

export const CREATE_OBJECT_DIALOG = DXN.make(`${DXN.getName(meta.id)}.createObjectDialog`);
export const CREATE_SPACE_DIALOG = DXN.make(`${DXN.getName(meta.id)}.createSpaceDialog`);
export const IMPORT_SPACE_DIALOG = DXN.make(`${DXN.getName(meta.id)}.importSpaceDialog`);
export const JOIN_DIALOG = DXN.make(`${DXN.getName(meta.id)}.joinDialog`);
export const OBJECT_RENAME_POPOVER = DXN.make(`${DXN.getName(meta.id)}.objectRenamePopover`);
export const SPACE_RENAME_POPOVER = DXN.make(`${DXN.getName(meta.id)}.spaceRenamePopover`);
