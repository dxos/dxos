//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Type } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Research } from '#types';

import {
  LIGHTHOUSE_CONNECTOR_ID,
  META_COMPANION,
  META_COMPANION_DATA,
  RESULT_COMPANION,
  RESULT_COMPANION_DATA,
} from '../constants.ts';
import { LighthouseNamespace } from '../namespace.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // The selected result's detail, beside the Research: the article selects a result, this companion shows it.
      AppGraphBuilder.createExtension({
        id: 'lighthouseResult',
        relation: AppNode.companion,
        match: (node) => (Research.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: RESULT_COMPANION,
              label: ['result.companion.label', { ns: LighthouseNamespace.key }],
              icon: 'ph--binoculars--regular',
              data: RESULT_COMPANION_DATA,
            }),
          ]),
      }),

      // Lighthouse itself (plugins, vocabulary, issues, storage), beside a Lighthouse connection.
      AppGraphBuilder.createExtension({
        id: 'lighthouseMeta',
        relation: AppNode.companion,
        match: (node) =>
          Connection.instanceOf(node.data) && node.data.connectorId === LIGHTHOUSE_CONNECTOR_ID
            ? Option.some(node.data)
            : Option.none(),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: META_COMPANION,
              label: ['meta.companion.label', { ns: LighthouseNamespace.key }],
              icon: 'ph--lighthouse--regular',
              data: META_COMPANION_DATA,
            }),
          ]),
      }),

      AppGraphBuilder.createExtension({
        id: 'lighthouseActions',
        match: (node) => (Research.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
        actions: (research) =>
          Effect.succeed([
            {
              id: 'delete',
              data: () =>
                Operation.invoke(
                  SpaceOperation.RemoveObjects,
                  { objects: [research] },
                  { spaceId: Obj.getDatabase(research)?.spaceId },
                ),
              properties: {
                label: ['delete-object.label', { ns: Type.getTypename(Research.Research) }],
                icon: 'ph--trash--regular',
                disposition: 'list-item',
              },
            },
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
