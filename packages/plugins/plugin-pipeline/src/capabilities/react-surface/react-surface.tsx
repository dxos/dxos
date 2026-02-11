//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { Layout } from '@dxos/react-ui-mosaic';
import { Pipeline } from '@dxos/types';

import { PipelineContainer, PipelineObjectSettings } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: Pipeline.Pipeline } => Obj.instanceOf(Pipeline.Pipeline, data.subject),
        component: ({ data, role }) => <PipelineContainer role={role} subject={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/companion/invocations`,
        role: 'article',
        filter: (data): data is { companionTo: Pipeline.Pipeline } =>
          Obj.instanceOf(Pipeline.Pipeline, data.companionTo) && data.subject === 'invocations',
        component: ({ data, role }) => {
          const db = Obj.getDatabase(data.companionTo);
          // TODO(wittjosiah): Filter the invocations to those relevant to the project.
          return (
            <Layout.Main role={role}>
              <InvocationTraceContainer db={db} detailAxis='block' />
            </Layout.Main>
          );
        },
      }),
      Common.createSurface({
        id: `${meta.id}/object-settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Pipeline.Pipeline } => Obj.instanceOf(Pipeline.Pipeline, data.subject),
        component: ({ data }) => <PipelineObjectSettings pipeline={data.subject} />,
      }),
    ]),
  ),
);
