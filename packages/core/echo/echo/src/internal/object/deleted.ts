//
// Copyright 2025 DXOS.org
//

import { type BaseObject, DeletedId } from '../types';

/**
 * @returns `true` if the object has been marked as deleted.
 */
export const isDeleted = (obj: BaseObject): boolean => {
  if ((obj as any)[DeletedId] === undefined) {
    // TODO(dmaretskyi): Return to prior behavior of throwing.
    // throw new Error('Object does not support deletion marker');
    return false;
  }

  return (obj as any)[DeletedId] ?? false;
};
