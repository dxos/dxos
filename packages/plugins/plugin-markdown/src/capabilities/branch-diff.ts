//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { Markdown } from '#types';

// Opt in to the Branches companion's per-branch diff: the markdown article overlays an inline diff
// on the live editor when its surface receives `mode === 'diff'` (see useBranchDiffExtension).
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.BranchDiffSupport, {
      typename: Type.getTypename(Markdown.Document),
    });
  }),
);
