//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Pipeline } from '@dxos/types';

import { PipelineArticle, PipelineProperties } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'root',
        filter: AppSurface.object(AppSurface.Article, Pipeline.Pipeline),
        component: PipelineArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.Root.create({
        id: 'objectProperties',
        filter: AppSurface.object(AppSurface.ObjectProperties, Pipeline.Pipeline),
        component: PipelineProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
