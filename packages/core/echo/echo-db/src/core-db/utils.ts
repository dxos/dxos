//
// Copyright 2024 DXOS.org
//

import { type Prop } from '@dxos/automerge/automerge';
import { isValidAutomergeUrl } from '@dxos/automerge/automerge-repo';
import { type SpaceDoc } from '@dxos/echo-protocol';

import { type DocumentChanges } from './automerge-doc-loader';
import { type ChangeEvent } from './automerge-repo-replacement';

export const getInlineAndLinkChanges = (event: ChangeEvent<SpaceDoc>) => {
  const inlineChangedObjectIds = new Set<string>();
  const linkedDocuments: DocumentChanges['linkedDocuments'] = {};
  for (const patch of event.patches) {
    if (!('path' in patch) || !('value' in patch)) {
      continue;
    }
    const { path, value } = patch;
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
