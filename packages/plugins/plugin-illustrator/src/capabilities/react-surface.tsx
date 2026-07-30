//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DrawingArticle, DrawingCard } from '#containers';

import { Drawing } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'drawing',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Drawing.Drawing),
          AppSurface.object(AppSurface.Section, Drawing.Drawing),
          AppSurface.object(AppSurface.Slide, Drawing.Drawing),
        ),
        component: ({ data: { subject, attendableId, extrinsic }, role }) => (
          <DrawingArticle role={role} subject={subject} attendableId={attendableId} extrinsic={extrinsic} />
        ),
      }),
      Surface.create({
        id: 'drawingCard',
        filter: AppSurface.object(AppSurface.CardContent, Drawing.Drawing),
        component: ({ data, role }) => <DrawingCard role={role} subject={data.subject} editable={data.editable} />,
      }),
    ]),
  ),
);
