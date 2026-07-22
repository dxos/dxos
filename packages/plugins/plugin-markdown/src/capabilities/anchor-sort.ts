//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Relation, Type } from '@dxos/echo';
import { getRangeFromCursor } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { type AnchoredTo } from '@dxos/types';

import { Markdown } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.AnchorSort, {
      key: Type.getTypename(Markdown.Document),
      sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => {
        const doc = Relation.getTarget(anchorA) as Markdown.Document;
        const accessor = doc.content.target ? Doc.createAccessor(doc.content.target, ['content']) : undefined;
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
  ),
);
