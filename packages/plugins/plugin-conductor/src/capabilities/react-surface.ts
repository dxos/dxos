//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';

import { CanvasArticle } from '#containers';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(
        Capabilities.ReactSurface,
        Surface.create({
          id: 'root',
          // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
          filter: AppSurface.oneOf(
            AppSurface.object(AppSurface.Article, CanvasBoard.CanvasBoard),
            AppSurface.object(AppSurface.Section, CanvasBoard.CanvasBoard),
          ),
          component: CanvasArticle,
          props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
        }),
      ),
    ),
  {
    roles: ['org.dxos.role.article', 'org.dxos.role.section'],
  },
);
