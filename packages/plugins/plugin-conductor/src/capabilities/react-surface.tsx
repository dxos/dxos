//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';

import { CanvasContainer } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: meta.id,
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(CanvasBoard.CanvasBoard),
        component: ({ data, role }) => (
          <CanvasContainer role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ),
  ),
);
