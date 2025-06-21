//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { getTarget } from '@dxos/react-client/echo';

import { compareIndexPositions, SheetType } from '../types';

export default () =>
  contributes(Capabilities.AnchorSort, {
    key: Type.getTypename(SheetType)!,
    sort: (anchorA, anchorB) => {
      const sheet = getTarget(anchorA) as SheetType;
      if (sheet !== getTarget(anchorB)) {
        return 0;
      }

      return !anchorA.anchor || !anchorB.anchor ? 0 : compareIndexPositions(sheet, anchorA.anchor, anchorB.anchor);
    },
  });
