//
// Copyright 2025 DXOS.org
//

import { ObjectDeletedId } from '../entities';
import { type AnyProperties } from '../types';

/**
 * @returns `true` if the object has been marked as deleted.
 */
export const isDeleted = (obj: AnyProperties): boolean => {
  if ((obj as any)[ObjectDeletedId] === undefined) {
    // TODO(dmaretskyi): Return to prior behavior of throwing.
    // throw new Error('Object does not support deletion marker');
    return false;
  }

  return (obj as any)[ObjectDeletedId] ?? false;
};
