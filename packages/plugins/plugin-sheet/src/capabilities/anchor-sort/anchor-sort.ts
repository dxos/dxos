//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Relation } from '@dxos/echo';

import { Sheet, compareIndexPositions } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(AppCapabilities.AnchorSort, {
      key: Sheet.Sheet.typename,
      sort: (anchorA, anchorB) => {
        const sheet = Relation.getTarget(anchorA) as Sheet.Sheet;
        if (sheet !== Relation.getTarget(anchorB)) {
          return 0;
        }

        return !anchorA.anchor || !anchorB.anchor ? 0 : compareIndexPositions(sheet, anchorA.anchor, anchorB.anchor);
      },
    }),
  ),
);
