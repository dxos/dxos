//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SketchArticle, SketchCard } from '#containers';

import { Sketch } from '../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'sketch',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Sketch.Sketch),
          AppSurface.object(AppSurface.Section, Sketch.Sketch),
          AppSurface.object(AppSurface.Slide, Sketch.Sketch),
        ),
        component: ({ data: { subject, attendableId, extrinsic }, role }) => (
          <SketchArticle role={role} subject={subject} attendableId={attendableId} extrinsic={extrinsic} />
        ),
      }),
      Surface.create({
        id: 'sketchCard',
        filter: AppSurface.object(AppSurface.CardContent, Sketch.Sketch),
        component: ({ data, role }) => <SketchCard role={role} subject={data.subject} editable={data.editable} />,
      }),
    ]),
  ),
);
