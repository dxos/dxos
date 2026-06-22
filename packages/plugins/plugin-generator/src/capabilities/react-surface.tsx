//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { GenerationArticle, GenerationProperties } from '#containers';
import { Generation } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'generation',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Generation.Generation),
          AppSurface.object(AppSurface.Section, Generation.Generation),
        ),
        component: ({ data, role }) => (
          <GenerationArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: 'objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, Generation.Generation),
        component: ({ data }) => <GenerationProperties subject={data.subject} />,
      }),
    ]),
  ),
);
