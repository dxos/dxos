//
// Copyright 2024 DXOS.org
//

import { type Doc, next as am } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';

/**
 * This function will clone the source document while preserving history and then patch it in one change so it matches the target data.
 */
export const migrateDocument = <T>(source: Doc<T>, targetData: T): Doc<T> => {
  const clonedDoc = am.clone(source);

  const changedDoc = am.change(clonedDoc, (applyTo) => {
    const coalesce = (applyTo: any, targetData: any) => {
      invariant(typeof applyTo === 'object' && applyTo !== null);
      invariant(typeof targetData === 'object' && targetData !== null);

      // Recursively coalesce objects
      for (const key in targetData) {
        if (targetData[key] !== applyTo[key]) {
          if (typeof targetData[key] === 'object' && targetData[key] !== null) {
            applyTo[key] ??= {};
            coalesce(applyTo[key], targetData[key]);
          } else if (typeof applyTo[key] === 'string' && typeof targetData[key] === 'string') {
            // Special case for strings: update that preserves history
            am.updateText(applyTo, [key], targetData[key]);
          } else {
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

  return changedDoc;
};
