//
// Copyright 2026 DXOS.org
//

import * as Obj from '../../Obj.ts';
import * as Text from '../../Text.ts';
import { setOverlay } from './overlay.ts';
import { type Write } from './types.ts';

/**
 * Apply a batch of writes to the base object as a single change.
 *
 * Every write names exactly what it touches, so a concurrent peer editing a different property (or a
 * different range of the same string) merges instead of being overwritten.
 */
export const applyWrites = (obj: Obj.Unknown, writes: readonly Write[]): void => {
  if (writes.length === 0) {
    return;
  }

  Obj.update(obj, (obj) => {
    for (const write of writes) {
      switch (write.kind) {
        case 'assign': {
          Obj.setValue(obj, write.path, write.value);
          break;
        }
        case 'splice': {
          Text.splice(obj, write.path, write.start, write.deleteCount, write.insert);
          break;
        }
        case 'overlay': {
          setOverlay(obj, write.lens, write.property, write.value);
          break;
        }
      }
    }
  });
};
