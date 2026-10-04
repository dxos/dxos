//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Obj } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { meta } from '#meta';
import { MESSENGER_COMPANION, MessengerCapabilities, Notifications } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const notificationsAtom = yield* MessengerCapabilities.NotificationsContainer;

    // Split from the count so a read-state change does not re-run the feed query.
    const messagesAtom = Atom.make((get) => {
      const notifications = get(notificationsAtom);
      const feed = notifications && get(notifications.feed.atom);
      const db = notifications && Obj.getDatabase(notifications);
      return feed && db ? get(db.query(Notifications.messagesQuery(feed)).atom) : undefined;
    });
    const unreadAtom = Atom.make((get) => {
      const notifications = get(notificationsAtom);
      const messages = get(messagesAtom);
      return notifications && messages
        ? Notifications.countUnread(messages, get(Obj.atom(notifications)).readIds)
        : undefined;
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
