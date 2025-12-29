//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { Relation } from '@dxos/echo';
import { createDocAccessor, getRangeFromCursor } from '@dxos/echo-db';
import { type AnchoredTo } from '@dxos/types';

import { Markdown } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.AnchorSort, {
    key: Markdown.Document.typename,
    sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => {
      const doc = Relation.getTarget(anchorA) as Markdown.Document;
      const accessor = doc.content.target ? createDocAccessor(doc.content.target, ['content']) : undefined;
      if (doc !== Relation.getTarget(anchorB) || !accessor) {
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
  }),
);
