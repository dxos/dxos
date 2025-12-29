//
// Copyright 2025 DXOS.org
//

import { Capability, Common } from '@dxos/app-framework';
import { Relation } from '@dxos/echo';

import { Sheet, compareIndexPositions } from '../../types';

export default Capability.makeModule(
  (): Capability.Capability<typeof Common.Capability.AnchorSort> =>
    Capability.contributes(Common.Capability.AnchorSort, {
      key: Sheet.Sheet.typename,
      sort: (anchorA, anchorB) => {
        const sheet = Relation.getTarget(anchorA) as Sheet.Sheet;
        if (sheet !== Relation.getTarget(anchorB)) {
          return 0;
        }

        return !anchorA.anchor || !anchorB.anchor ? 0 : compareIndexPositions(sheet, anchorA.anchor, anchorB.anchor);
      },
    }),
);
