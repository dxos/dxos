//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { createDocAccessor, getRangeFromCursor, getTarget } from '@dxos/echo-db';
import { type AnchoredTo } from '@dxos/types';

import { Markdown } from '../types';

export default () =>
  contributes(Capabilities.AnchorSort, {
    key: Markdown.Document.typename,
    sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => {
      const doc = getTarget(anchorA) as Markdown.Document;
      const accessor = doc.content.target ? createDocAccessor(doc.content.target, ['content']) : undefined;
      if (doc !== getTarget(anchorB) || !accessor) {
        return 0;
      }

      const getStartPosition = (cursor: string | undefined) => {
        const range = cursor ? getRangeFromCursor(accessor, cursor) : undefined;
        return range?.start ?? Number.MAX_SAFE_INTEGER;
      };

      const posA = getStartPosition(anchorA.anchor);
      const posB = getStartPosition(anchorB.anchor);
      return posA - posB;
    },
  });
