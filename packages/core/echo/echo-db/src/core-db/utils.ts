//
// Copyright 2024 DXOS.org
//

import { type Patch } from '@dxos/automerge/automerge';
import { isValidAutomergeUrl } from '@dxos/automerge/automerge-repo';
import { type SpaceDoc } from '@dxos/echo-protocol';

import { type DocumentChanges } from './automerge-doc-loader';
import { type ChangeEvent } from '../client';

export const getInlineAndLinkChanges = (event: ChangeEvent<SpaceDoc>) => {
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
