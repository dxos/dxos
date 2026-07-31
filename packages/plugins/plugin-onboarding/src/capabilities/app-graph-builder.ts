//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { ABOUT_DIALOG } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extension = yield* GraphBuilder.createExtension({
      id: 'about',
      match: NodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          Node.makeAction({
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
