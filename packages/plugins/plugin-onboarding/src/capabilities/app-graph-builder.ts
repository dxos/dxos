//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { ABOUT_DIALOG } from '../constants.ts';
import { meta } from '../meta.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extension = yield* AppGraphBuilder.createExtension({
      id: 'about',
      match: GraphNodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: 'openAbout',
            data: Effect.fnUntraced(function* () {
              yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                subject: ABOUT_DIALOG,
              });
            }),
            properties: {
              label: ['open-about.label', { ns: meta.profile.key }],
              icon: 'ph--info--regular',
              disposition: 'menu',
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extension);
  }),
);
