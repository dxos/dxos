//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { parseThreadAnchorAsCellRange } from '../integrations/thread-ranges';
import { SheetCapabilities, SheetOperation } from '../types';

const handler: Operation.WithHandler<typeof SheetOperation.ScrollToAnchor> = SheetOperation.ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, id }) {
      const gridInstances = yield* Capability.get(SheetCapabilities.GridInstances);
      const entry = gridInstances.get(subject);
      if (!entry) {
        return;
      }

      entry.setActiveRefs(id);
      const range = parseThreadAnchorAsCellRange(cursor);
      if (range) {
        entry.grid.setFocus({ ...range.to, plane: 'grid' }, true);
      }
    }),
  ),
);

export default handler;
