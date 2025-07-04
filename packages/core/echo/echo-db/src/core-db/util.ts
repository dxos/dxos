//
// Copyright 2024 DXOS.org
//

import { type Patch, next as A } from '@automerge/automerge';
import { isValidAutomergeUrl } from '@automerge/automerge-repo';

import { type DatabaseDirectory } from '@dxos/echo-protocol';

import { type DocumentChanges } from './automerge-doc-loader';
import { type ChangeEvent } from '../automerge';

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
