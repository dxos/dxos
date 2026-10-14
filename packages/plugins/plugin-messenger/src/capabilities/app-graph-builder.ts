//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { MESSENGER_COMPANION, meta } from '#meta';
import { MessengerCapabilities, Notifications } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const containersAtom = yield* MessengerCapabilities.NotificationsContainers;

    const unreadAtom = Atom.make((get) => {
      const containers = get(containersAtom);
      return containers.length > 0 ? Notifications.countUnread(Notifications.deriveView(get, containers)) : undefined;
    }).pipe(Atom.keepAlive);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'deckCompanion',
        relation: AppNode.companion,
        match: GraphNodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: MESSENGER_COMPANION,
              label: ['notifications-panel.label', { ns: meta.profile.key }],
              icon: 'ph--envelope--regular',
              data: MESSENGER_COMPANION,
              badge: unreadAtom,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
