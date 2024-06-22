//
// Copyright 2024 DXOS.org
//

import { isValidAutomergeUrl, type DocHandleChangePayload } from '@dxos/automerge/automerge-repo';
import { type DocumentChanges } from '@dxos/echo-pipeline';
import { type SpaceDoc } from '@dxos/echo-protocol';

export const getInlineAndLinkChanges = (event: DocHandleChangePayload<SpaceDoc>) => {
  const inlineChangedObjectIds = new Set<string>();
  const linkedDocuments: DocumentChanges['linkedDocuments'] = {};
  for (const { path, value } of event.patches) {
    if (path.length < 2) {
      continue;
    }
    switch (path[0]) {
      case 'objects':
        if (path.length >= 2) {
          inlineChangedObjectIds.add(path[1]);
        }
        break;
      case 'links':
        if (path.length >= 2 && typeof value === 'string' && isValidAutomergeUrl(value)) {
          linkedDocuments[path[1]] = value;
        }
        break;
    }
  }
  return {
    inlineChangedObjects: [...inlineChangedObjectIds],
    linkedDocuments,
  };
};
