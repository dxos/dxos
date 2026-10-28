//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { ResearchArticle, ResultArticle } from '#containers';
import { Research } from '#types';

import { RESULT_COMPANION_DATA } from '../constants.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'researchArticle',
        filter: AppSurface.object(AppSurface.Article, Research.Research),
        component: ResearchArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // The selected result's detail: the companion's subject is a sentinel, the Research is what it is a companion to.
      Surface.create({
        id: 'resultCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, RESULT_COMPANION_DATA),
          AppSurface.companion(AppSurface.Article, Research.Research),
        ),
        component: ResultArticle,
        props: ({ role, data: { subject, companionTo, attendableId } }) => ({
          role,
          subject,
          companionTo,
          attendableId,
        }),
      }),
    ]),
  ),
);
