//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { createDocAccessor, getRangeFromCursor, getTarget } from '@dxos/react-client/echo';

import { Markdown } from '../types';

export default () =>
  contributes(Capabilities.AnchorSort, {
    key: Type.getTypename(Markdown.Doc)!,
    sort: (anchorA, anchorB) => {
      const doc = getTarget(anchorA) as Markdown.Doc;
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
