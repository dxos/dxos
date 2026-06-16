//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, createTypeSectionExtension } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Pipeline } from '@dxos/types';

import { meta } from '#meta';
import { getPipelinesPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      createTypeSectionExtension(Pipeline.Pipeline),

      GraphBuilder.createExtension({
        id: 'pipelinesSectionActions',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === Type.getTypename(Pipeline.Pipeline) && space ? Option.some(space) : Option.none();
        },
        actions: (space) =>
          Effect.succeed([
            Node.makeAction({
              id: 'create-pipeline',
              data: () =>
                Operation.invoke(SpaceOperation.OpenCreateObject, {
                  target: space.db,
                  typename: Type.getTypename(Pipeline.Pipeline),
                  targetNodeId: getPipelinesPath(space.db.spaceId),
                }),
              properties: {
                label: ['add-object.label', { ns: Type.getTypename(Pipeline.Pipeline) }],
                icon: 'ph--plus--regular',
                disposition: 'list-item-primary',
              },
            }),
          ]),
      }),

      GraphBuilder.createTypeExtension({
        id: 'triggers',
        type: Pipeline.Pipeline,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: 'invocations',
              label: ['pipeline-invocations.label', { ns: meta.id }],
              icon: 'ph--clock-countdown--regular',
              data: 'invocations',
            }),
            AppNode.makeCompanion({
              id: 'automation',
              label: ['pipeline-automation.label', { ns: meta.id }],
              icon: 'ph--lightning--regular',
              data: 'automation',
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
