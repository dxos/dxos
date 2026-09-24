//
// Copyright 2024 DXOS.org
//

import { next as A, type Patch } from '@automerge/automerge';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';

import { type DatabaseDirectory } from '@dxos/echo-protocol';

import { type ChangeEvent } from '../automerge/index.ts';
import { type DocumentChanges } from './types.ts';

export const getInlineAndLinkChanges = (event: ChangeEvent<DatabaseDirectory>) => {
  const inlineChangedObjectIds = new Set<string>();
  const linkedDocuments: DocumentChanges['linkedDocuments'] = {};
  for (const { path, value } of event.patches as (Patch & { value: any })[]) {
    if (path.length < 2) {
      continue;
    }
    switch (path[0]) {
      case 'objects':
        if (path.length >= 2) {
          inlineChangedObjectIds.add(path[1] as string);
        }
        break;
      case 'links':
        if (path.length >= 2 && (typeof value === 'string' || value instanceof A.RawString)) {
          const valueStr = value.toString();
          if (isValidAutomergeUrl(valueStr)) {
            linkedDocuments[path[1]] = valueStr;
          }
        }
        break;
    }
  }
  return {
    inlineChangedObjects: [...inlineChangedObjectIds],
    linkedDocuments,
  };
};

/**
 * Object ids whose entry was removed from a directory's `objects` or `links` map.
 *
 * Read from the patches rather than diffed against the working set: a root change accompanies every
 * object write, so a scan would run on the hot path.
 */
export const getRemovedObjectIds = (event: ChangeEvent<DatabaseDirectory>): string[] => {
  const removed = new Set<string>();
  for (const patch of event.patches) {
    if (
      patch.action === 'del' &&
      patch.path.length === 2 &&
      (patch.path[0] === 'objects' || patch.path[0] === 'links')
    ) {
      removed.add(patch.path[1] as string);
    }
  }
  return [...removed];
};
