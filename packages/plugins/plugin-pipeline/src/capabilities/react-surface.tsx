//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Pipeline } from '@dxos/types';

import { PipelineArticle, PipelineProperties } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        filter: AppSurface.object(AppSurface.Article, Pipeline.Pipeline),
        component: ({ data, role }) => (
          <PipelineArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Pipeline.Pipeline),
        component: ({ data }) => <PipelineProperties subject={data.subject} />,
      }),
    ]),
  ]),
);
