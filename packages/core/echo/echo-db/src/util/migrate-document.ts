//
// Copyright 2024 DXOS.org
//

import { type Doc, next as am } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

/**
 * This function will clone the source document while preserving history and then patch it in one change so it matches the target data.
 */
export const migrateDocument = <T>(source: Doc<any>, targetData: T): Doc<T> => {
  log('begin migration', { source, targetData });

  const clonedDoc = am.clone(source);

  const changedDoc = am.change(clonedDoc, (applyTo) => {
    const coalesce = (applyTo: any, targetData: any) => {
      invariant(typeof applyTo === 'object' && applyTo !== null);
      invariant(typeof targetData === 'object' && targetData !== null);

      // Recursively coalesce objects
      for (const key in targetData) {
        if (targetData[key] !== applyTo[key]) {
          if (typeof targetData[key] === 'object' && targetData[key] !== null) {
            if (Array.isArray(targetData[key]) && !Array.isArray(applyTo[key])) {
              applyTo[key] = [];
            } else if (typeof applyTo[key] !== 'object' || applyTo[key] === null) {
              applyTo[key] = {};
            }
            coalesce(applyTo[key], targetData[key]);
          } else {
            // TODO(dmaretskyi): It's possible to provide a special case for string migrations with `am.updateText`.
            applyTo[key] = targetData[key];
          }
        }
      }

      // Delete extra keys
      for (const key in applyTo) {
        if (!(key in targetData)) {
          delete applyTo[key];
        }
      }
    };

    coalesce(applyTo, targetData);
  });

  log('end migration', { changedDoc });

  return changedDoc;
};
