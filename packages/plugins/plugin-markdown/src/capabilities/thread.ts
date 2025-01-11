//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework/next';
import { ThreadCapabilities } from '@dxos/plugin-space';
import { createDocAccessor, getRangeFromCursor } from '@dxos/react-client/echo';

import { DocumentType } from '../types';

export default () =>
  contributes(ThreadCapabilities.Thread, {
    predicate: (obj) => obj instanceof DocumentType,
    createSort: (doc: DocumentType) => {
      const accessor = doc.content.target ? createDocAccessor(doc.content.target, ['content']) : undefined;
      if (!accessor) {
        return (_) => 0;
      }

      const getStartPosition = (cursor: string | undefined) => {
        const range = cursor ? getRangeFromCursor(accessor, cursor) : undefined;
        return range?.start ?? Number.MAX_SAFE_INTEGER;
      };

      return (anchorA: string | undefined, anchorB: string | undefined): number => {
        if (anchorA === undefined || anchorB === undefined) {
          return 0;
        }
        const posA = getStartPosition(anchorA);
        const posB = getStartPosition(anchorB);
        return posA - posB;
      };
    },
  });
