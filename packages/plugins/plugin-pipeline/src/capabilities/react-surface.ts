//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Pipeline } from '@dxos/types';

import { PipelineArticle, PipelineProperties } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'root',
        filter: AppSurface.object(AppSurface.Article, Pipeline.Pipeline),
        component: PipelineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Pipeline.Pipeline),
        component: PipelineProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
