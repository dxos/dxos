//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { SheetCapabilities, SheetOperation, SheetUtil } from '#types';

const handler: Operation.WithHandler<typeof SheetOperation.ScrollToAnchor> = SheetOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, thread }) {
      const gridInstances = yield* Capability.get(SheetCapabilities.GridInstances);
      const entry = gridInstances.get(subject);
      if (!entry) {
        return;
      }

      // Cells mark their threads by URI, so the grid highlights the cells whose `data-refs` hold this one.
      entry.setActiveRefs(thread?.uri.toString() ?? '');
      const range = SheetUtil.rangeFromAnchor(entry.sheet, anchor);
      if (range) {
        entry.grid.setFocus({ ...range.to, plane: 'grid' }, true);
      }
    }),
  ),
);

export default handler;
