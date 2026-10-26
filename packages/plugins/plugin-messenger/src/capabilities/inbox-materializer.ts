//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SpaceInvitationOperation from '@dxos/app-toolkit/SpaceInvitationOperation';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type Message, SpaceInvitationMessage } from '@dxos/types';

import { startInboxMaterializer } from '#materializer';
import { meta } from '#meta';
import { describeMessage, makeArrivals } from '#push';
import { MessengerCapabilities, Notifications } from '#types';

/**
 * Stores inbox messages in the default space's notifications feed and announces new space
 * invitations with a toast. Only the device that wrote a message toasts it; the others receive it
 * by replication, so one invitation is never announced twice. Where the app shows its own
 * notifications (the desktop app), every device notifies each new message while unfocused, as a push would.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;
    const invoker = yield* Capabilities.OperationInvoker;
    const client = yield* ClientCapabilities.Client;
    // Both optional and read live: the notifier is desktop-only, and the opt-in module activates alongside this one.
    const notifiers = yield* Capability.contributions(AppCapabilities.LocalNotifier);
    const push = yield* Capability.contributions(AppCapabilities.PushNotifications);

    const spaceAtom = Atom.make<Space | undefined>(undefined).pipe(Atom.keepAlive);
    const notificationsAtom = Atom.make((get) => {
      const space = get(spaceAtom);
      return space ? Notifications.order(get(space.db.query(Filter.type(Notifications.Notifications)).atom)) : [];
    }).pipe(Atom.keepAlive);

    const announce = (message: Message.Message) =>
      Option.map(SpaceInvitationMessage.match(message), ({ spaceKey }) => {
        void invoker
          .invokePromise(LayoutOperation.AddToast, {
            // Keyed by space so a repeat invitation replaces rather than stacks.
            id: `${meta.profile.key}/space-invitation/${spaceKey}`,
            icon: 'ph--envelope-simple--regular',
            title: ['space-invitation-toast.title', { ns: meta.profile.key }],
            description: ['space-invitation-toast.description', { ns: meta.profile.key }],
            actionLabel: ['join-space-invitation.label', { ns: meta.profile.key }],
            actionAlt: ['join-space-invitation.label', { ns: meta.profile.key }],
            closeLabel: ['dismiss-space-invitation.label', { ns: meta.profile.key }],
            onAction: () =>
              void invoker
                .invokePromise(SpaceInvitationOperation.JoinBySpaceKey, { spaceKey })
                .then(({ error }) => error && log.warn('failed to join space from invitation', { error, spaceKey })),
          })
          .then(({ error }) => error && log.warn('failed to add space invitation toast', { error }));
      });

    // Only while the window is not in front: a focused app already shows the message (and toasts invitations).
    const notify = (message: Message.Message) => {
      const notifier = notifiers.get()[0];
      const status = push.get()[0]?.status;
      if (!notifier || !status || registry.get(status) !== 'on' || document.hasFocus()) {
        return;
      }
      notifier.show(describeMessage(message)).catch((error) => log.warn('failed to show notification', { error }));
    };

    // From the feed rather than `onWritten`, since another device of this identity often files the message first.
    // The query is subscribed directly: read as an atom through `deriveView`, it missed appended messages.
    const arrivals = makeArrivals({ since: Date.now(), key: Notifications.messageKey });
    let unwatchFeeds = () => {};
    let generation = 0;
    const watchFeeds = (containers: readonly Notifications.Notifications[]) => {
      unwatchFeeds();
      unwatchFeeds = () => {};
      const current = ++generation;
      const db = containers[0] && Obj.getDatabase(containers[0]);
      if (!db) {
        return;
      }
      void Promise.all(containers.map((container) => container.feed.load()))
        .then((feeds) => {
          if (current !== generation) {
            return;
          }
          const query = db.query(Notifications.messagesQuery(feeds));
          unwatchFeeds = query.subscribe(
            () => arrivals(Notifications.view(query.runSync(), Notifications.readKeys(containers))).forEach(notify),
            { fire: true },
          );
        })
        .catch((error) => log.warn('failed to watch notifications', { error }));
    };
    const unwatchContainers = registry.subscribe(notificationsAtom, watchFeeds, { immediate: true });

    const materializer = startInboxMaterializer({
      client,
      getSpace: () => {
        // The default space is designated on the settings space, which may still be opening.
        const settingsSpace = AppSpace.getSettingsSpace(client);
        if (settingsSpace && settingsSpace.state.get() !== SpaceState.SPACE_READY) {
          void settingsSpace.waitUntilReady().then(() => materializer.refresh());
          return undefined;
        }
        return AppSpace.getDefaultSpace(client);
      },
      onSpaceReady: (space) => {
        if (registry.get(spaceAtom) !== space) {
          registry.set(spaceAtom, space);
        }
      },
      onWritten: announce,
    });

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unwatchContainers();
        generation++;
        unwatchFeeds();
        materializer.stop();
      }),
    );
    return Capability.contribute(MessengerCapabilities.NotificationsContainers, notificationsAtom);
  }),
);
