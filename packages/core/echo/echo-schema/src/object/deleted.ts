//
// Copyright 2025 DXOS.org
//

import { DeletedId } from './model';
import type { BaseObject } from '../types';

/**
 * @returns `true` if the object has been marked as deleted.
 */
export const isDeleted = (obj: BaseObject): boolean => {
  if ((obj as any)[DeletedId] === undefined) {
    throw new Error('Object does not support deletion marker');
  }
  return (obj as any)[DeletedId] ?? false;
};
