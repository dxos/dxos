//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/app-graph';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

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
            id: 'open-about',
            data: Effect.fnUntraced(function* () {
              yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                subject: ABOUT_DIALOG,
              });
            }),
            properties: {
              label: ['open-about.label', { ns: meta.id }],
              icon: 'ph--info--regular',
              disposition: 'menu',
            },
          }),
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extension);
  }),
);
