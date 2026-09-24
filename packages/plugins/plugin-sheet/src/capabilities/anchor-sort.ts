//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Relation, Type } from '@dxos/echo';

import { Sheet, SheetUtil } from '#types';
import { SheetEvents } from '#types';

export const AnchorSort = AppCapability.anchorSort(
  () =>
    Effect.succeed(
      Capability.contribute(AppCapabilities.AnchorSort, {
        key: Type.getTypename(Sheet.Sheet),
        sort: (anchorA, anchorB) => {
          const sheet = Relation.getTarget(anchorA) as Sheet.Sheet;
          if (sheet !== Relation.getTarget(anchorB)) {
            return 0;
          }

          return !anchorA.anchor || !anchorB.anchor
            ? 0
            : SheetUtil.compareIndexPositions(sheet, anchorA.anchor, anchorB.anchor);
        },
      }),
    ),
  {
    // Ordering-only: registers the sort comparator once the app graph exists; the body reads
    // nothing else.
    requires: [AppCapabilities.AppGraph],
    activatesOn: SheetEvents.Start,
  },
);
