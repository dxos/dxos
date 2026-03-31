//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { parseThreadAnchorAsCellRange } from '../integrations/thread-ranges';
import { SheetCapabilities } from '../types';
import { ScrollToAnchor } from './definitions';

const handler: Operation.WithHandler<typeof ScrollToAnchor> = ScrollToAnchor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, cursor, ref }) {
      const gridInstances = yield* Capability.get(SheetCapabilities.GridInstances);
      const entry = gridInstances.get(subject);
      if (!entry) {
        return;
      }
      entry.setActiveRefs(ref);
      const range = parseThreadAnchorAsCellRange(cursor);
      if (range) {
        entry.grid.setFocus({ ...range.to, plane: 'grid' }, true);
      }
    }),
  ),
);

export default handler;
