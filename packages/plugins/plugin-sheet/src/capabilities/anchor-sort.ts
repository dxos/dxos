//
// Copyright 2025 DXOS.org
//

import { Capabilities, type Capability, contributes } from '@dxos/app-framework';
import { Relation } from '@dxos/echo';

import { Sheet, compareIndexPositions } from '../types';

export default (): Capability<typeof Capabilities.AnchorSort> =>
  contributes(Capabilities.AnchorSort, {
    key: Sheet.Sheet.typename,
    sort: (anchorA, anchorB) => {
      const sheet = Relation.getTarget(anchorA) as Sheet.Sheet;
      if (sheet !== Relation.getTarget(anchorB)) {
        return 0;
      }

      return !anchorA.anchor || !anchorB.anchor ? 0 : compareIndexPositions(sheet, anchorA.anchor, anchorB.anchor);
    },
  });
