//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { Sheet } from '#types';

// Opt in to the Branches companion's per-branch diff: the sheet article highlights cells that differ
// from the compared branch when its surface receives `mode === 'diff'` (see useSheetBranchDiff).
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.BranchDiffSupport, {
      typename: Type.getTypename(Sheet.Sheet),
    });
  }),
);
