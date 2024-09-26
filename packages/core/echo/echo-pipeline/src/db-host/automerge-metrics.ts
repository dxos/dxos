//
// Copyright 2024 DXOS.org
//

import * as A from '@dxos/automerge/automerge';
import { log } from '@dxos/log';

export type DocMetrics = {
  compressedByteSize: number;
  loadTime: number;
  mutationCount: number;
};

/**
 * WARN: Slow to run on large docs.
 */
export const measureDocMetrics = (doc: A.Doc<any>): DocMetrics => {
  const snapshot = A.save(doc);

  const start = Date.now();
  const temp = A.load(snapshot);
  const end = Date.now();
  A.free(temp);

  const getAllChangesStart = Date.now();
  const mutationCount = A.getAllChanges(doc).length;
  const getAllChangesEnd = Date.now();

  if (getAllChangesEnd - getAllChangesStart > 300) {
    log.warn('getAllChanges took too long', { elapsed: getAllChangesEnd - getAllChangesStart });
  }

  return {
    compressedByteSize: snapshot.byteLength,
    loadTime: end - start,
    mutationCount,
  };
};
