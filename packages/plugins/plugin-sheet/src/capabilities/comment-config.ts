//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { SheetOperation } from '#types';
import { Sheet } from '#types';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute types (TS2883).
const activate: () => Effect.Effect<
  Capability.Capability<typeof AppCapabilities.CommentConfig>,
  never,
  Capability.Service
> = Effect.fnUntraced(function* () {
  const config: AppCapabilities.CommentConfig = {
    id: Type.getTypename(Sheet.Sheet),
    comments: 'anchored',
    scrollToAnchor: SheetOperation.ScrollToAnchor,
  };
  return Capability.contributes(AppCapabilities.CommentConfig, config);
});

export default activate;
