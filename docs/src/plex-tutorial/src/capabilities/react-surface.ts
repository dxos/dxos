//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { StashedLinkArticle } from '../containers/StashedLinkArticle.tsx';
import { StashedLink } from '../types/StashedLink.ts';

// #region surface
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(
      Capabilities.ReactSurface,
      Surface.create({
        id: 'article',
        filter: AppSurface.object(AppSurface.Article, StashedLink),
        component: StashedLinkArticle,
        props: ({ role, data: { subject, attendableId } }) => ({
          role,
          subject,
          attendableId,
        }),
      }),
    ),
  ),
);
// #endregion
