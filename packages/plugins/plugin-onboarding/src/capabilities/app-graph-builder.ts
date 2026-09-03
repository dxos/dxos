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
import { Position } from '@dxos/util';

import { ABOUT_DIALOG } from '../constants';
import { meta } from '../meta';

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
              // The only entry with an explicit position: every other contributor ties at the
              // default 0, so this alone is what keeps About at the end of the app menu.
              position: Position.last,
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extension);
  }),
);
