//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { updateState } from './update-state';

export default LayoutOperation.UpdateSidebar.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ state }) {
      yield* updateState((layout) => {
        const next = state ?? layout.sidebarState;
        if (next !== layout.sidebarState) {
          return { sidebarState: next };
        }
        return {};
      });
    }),
  ),
);
