//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { SheetCapabilities, SheetOperation, SheetUtil } from '#types';

const handler: Operation.WithHandler<typeof SheetOperation.ScrollToAnchor> = SheetOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, anchor, follow, thread }) {
      const gridInstances = yield* Capability.get(SheetCapabilities.GridInstances);
      const entry = gridInstances.get(subject);
      if (!entry) {
        return;
      }

      const range = SheetUtil.rangeFromAnchor(entry.sheet, anchor);
      if (follow) {
        if (range) {
          entry.grid.scrollToCoord({ coords: { ...range.from, plane: 'grid' } });
        }
        return;
      }

      entry.setActiveRefs(thread);
      if (range) {
        entry.grid.setFocus({ ...range.to, plane: 'grid' }, true);
      }
    }),
  ),
);

export default handler;
