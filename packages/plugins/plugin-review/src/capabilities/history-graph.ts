//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Obj } from '@dxos/echo';

import { meta } from '#meta';
import { ReviewCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read through the atom: a provider contributed after the relation expands has to reach the matcher.
    const historyProvidersAtom = yield* Capability.atom(ReviewCapabilities.HistoryProvider);

    // Version history plank companion, gated per-type by a HistoryProvider contribution.
    const extension = yield* AppGraphBuilder.createExtension({
      id: 'history',
      relation: AppNode.companion,
      match: (node, get) => {
        if (!Obj.isObject(node.data)) {
          return Option.none();
        }
        const typename = Obj.getTypename(node.data);
        const provider = typename && get(historyProvidersAtom).find(({ id }) => id === typename);
        return provider ? Option.some(node) : Option.none();
      },
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            variant: 'history',
            label: ['history-panel.title', { ns: meta.profile.key }],
            icon: 'ph--git-branch--regular',
            data: 'history',
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extension);
  }),
);
