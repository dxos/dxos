//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SketchArticle, SketchCard } from '#containers';
import { Sketch, SketchCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'sketch',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Sketch.Sketch),
          AppSurface.object(AppSurface.Section, Sketch.Sketch),
          AppSurface.object(AppSurface.Slide, Sketch.Sketch),
        ),
        component: ({ data: { subject, attendableId, extrinsic }, role }) => {
          const settings = useAtomCapability(SketchCapabilities.Settings);
          return (
            <SketchArticle
              role={role}
              attendableId={attendableId}
              subject={subject}
              settings={settings}
              extrinsic={extrinsic}
            />
          );
        },
      }),
      Surface.create({
        id: 'sketchCard',
        filter: AppSurface.object(AppSurface.CardContent, Sketch.Sketch),
        component: ({ data, role }) => <SketchCard role={role} subject={data.subject} editable={data.editable} />,
      }),
    ]),
  ),
);
