//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Relation, Type } from '@dxos/echo';

import { Sheet, SheetUtil } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.AnchorSort, {
      key: Type.getTypename(Sheet.Sheet),
      sort: (anchorA, anchorB) => {
        const sheet = Relation.getTarget(anchorA) as Sheet.Sheet;
        if (sheet !== Relation.getTarget(anchorB)) {
          return 0;
        }

        // Whole-sheet comments have no anchor and sort after cell comments.
        if (!anchorA.anchor || !anchorB.anchor) {
          return (anchorA.anchor ? 0 : 1) - (anchorB.anchor ? 0 : 1);
        }

        return SheetUtil.compareAnchors(sheet, anchorA.anchor, anchorB.anchor);
      },
    }),
  ),
);
