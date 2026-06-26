//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CommentsArticle } from '#containers';

// NOTE: Settings are rendered by the generic plugin-settings surface from the
// `AppCapabilities.Settings` contribution (see capabilities/settings.ts);
// no plugin-specific settings surface is required.
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'comments',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'comments'),
          AppSurface.companion(AppSurface.Article),
        ),
        // TODO(wittjosiah): This isn't scrolling properly in a plank.
        component: ({ data }) => <CommentsArticle attendableId={data.attendableId} subject={data.companionTo} />,
      }),
    ]),
  ),
);
