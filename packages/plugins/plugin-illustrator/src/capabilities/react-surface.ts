//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DrawingArticle, DrawingCard } from '#containers';

import { Drawing } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'drawing',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Drawing.Drawing),
          AppSurface.object(AppSurface.Section, Drawing.Drawing),
          AppSurface.object(AppSurface.Slide, Drawing.Drawing),
        ),
        component: DrawingArticle,
        props: ({ role, data: { subject, attendableId, extrinsic } }) => ({ role, subject, attendableId, extrinsic }),
      }),
      Surface.create({
        id: 'drawingCard',
        filter: AppSurface.object(AppSurface.CardContent, Drawing.Drawing),
        component: DrawingCard,
        props: ({ role, data: { subject, editable } }) => ({ role, subject, editable }),
      }),
    ]),
  ),
);
