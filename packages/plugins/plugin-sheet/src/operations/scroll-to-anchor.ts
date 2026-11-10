//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { SheetCapabilities, SheetOperation, SheetUtil } from '#types';

const handler: Operation.WithHandler<typeof SheetOperation.ScrollToAnchor> = SheetOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, id }) {
      const gridInstances = yield* Capability.get(SheetCapabilities.GridInstances);
      const entry = gridInstances.get(subject);
      if (!entry) {
        return;
      }

      entry.setActiveRefs(id);
      const range = SheetUtil.rangeFromAnchor(entry.sheet, cursor);
      if (range) {
        entry.grid.setFocus({ ...range.to, plane: 'grid' }, true);
      }
    }),
  ),
);

export default handler;
