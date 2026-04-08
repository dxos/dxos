//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';
import { Pipeline } from '@dxos/types';

import { PipelineContainer, PipelineObjectSettings } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: AppSurface.objectArticle(Pipeline.Pipeline),
        component: ({ data, role }) => (
          <PipelineContainer role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.companion.invocations`,
        role: 'article',
        filter: AppSurface.and(
          AppSurface.literalArticle('invocations'),
          AppSurface.companionArticle(Pipeline.Pipeline),
        ),
        component: ({ data, role }) => {
          const db = Obj.getDatabase(data.companionTo);
          // TODO(wittjosiah): Filter the invocations to those relevant to the project.
          return (
            <Panel.Root role={role} className='dx-document'>
              <Panel.Content asChild>
                <InvocationTraceContainer db={db} detailAxis='block' />
              </Panel.Content>
            </Panel.Root>
          );
        },
      }),
      Surface.create({
        id: `${meta.id}.object-settings`,
        role: 'object-settings',
        filter: AppSurface.objectSettings(Pipeline.Pipeline),
        component: ({ data }) => <PipelineObjectSettings pipeline={data.subject} />,
      }),
    ]),
  ),
);
