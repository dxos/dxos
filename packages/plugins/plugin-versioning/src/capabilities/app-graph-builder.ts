//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { GraphBuilder } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { VersioningCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const getHistoryProvider = (typename: string) =>
      capabilities.getAll(VersioningCapabilities.HistoryProvider).find(({ id }) => id === typename);

    // Version history plank companion, gated per-type by a HistoryProvider contribution.
    const extension = yield* GraphBuilder.createExtension({
      id: 'history',
      match: (node) => {
        if (!Obj.isObject(node.data)) {
          return Option.none();
        }
        const typename = Obj.getTypename(node.data);
        return typename && getHistoryProvider(typename) ? Option.some(node) : Option.none();
      },
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('history'),
            label: ['history-panel.title', { ns: meta.profile.key }],
            icon: 'ph--git-branch--regular',
            data: 'history',
          }),
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extension);
  }),
);
