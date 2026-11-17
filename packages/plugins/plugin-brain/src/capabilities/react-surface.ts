//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { FactsCompanion, MemoryArticle } from '#containers';
import { BrainSurface } from '#types';

import { MEMORY_COMPANION_ID, MEMORY_SECTION_TYPE } from '../constants.ts';

/** React surfaces contributed by plugin-brain: the per-space facts panel and the memory view under space settings. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'brain.facts',
        filter: Surface.makeFilter(BrainSurface.Facts),
        component: FactsCompanion,
      }),
      Surface.create({
        id: 'brain.memory',
        filter: AppSurface.literal(AppSurface.Article, MEMORY_SECTION_TYPE),
        component: MemoryArticle,
      }),
      Surface.create({
        id: 'brain.memory.companion',
        filter: Surface.makeFilter(AppSurface.deckCompanion(MEMORY_COMPANION_ID)),
        component: MemoryArticle,
      }),
    ]),
  ),
);
