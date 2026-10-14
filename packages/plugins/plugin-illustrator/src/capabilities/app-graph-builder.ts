//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';

import { meta } from '#meta';
import { Drawing } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extension = yield* AppGraphBuilder.createTypeExtension({
      id: 'scores',
      relation: AppNode.companion,
      type: Drawing.Drawing,
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            variant: 'scores',
            label: ['scores.label', { ns: meta.profile.key }],
            icon: 'ph--gauge--regular',
            data: 'scores',
          }),
        ]),
    });
    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
