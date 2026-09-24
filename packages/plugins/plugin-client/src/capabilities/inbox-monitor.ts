//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { log } from '@dxos/log';

import { meta } from '#meta';
import { ClientCapabilities } from '#types';

import { SpaceInvitationTracker, filterSpaceInvitations, joinSpaceInvitation } from '../inbox/index.ts';

/**
 * Raises a toast with a Join action for each space a contact has invited this identity to.
 * The pending list itself lives in the account's Space invitations article.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const invoker = yield* Capabilities.OperationInvoker;
    const tracker = new SpaceInvitationTracker();

    const announce = () => {
      const invitations = filterSpaceInvitations(
        client.halo.inbox.notices.get(),
        client.halo.contacts.get(),
        client.spaces.get().map((space) => space.key),
      );
      for (const invitation of tracker.update(invitations)) {
        void invoker
          .invokePromise(LayoutOperation.AddToast, {
            // Keyed by space so a repeat invitation replaces rather than stacks.
            id: `${meta.profile.key}/space-invitation/${invitation.spaceKey.toHex()}`,
            icon: 'ph--envelope-simple--regular',
            title: ['space-invitation-toast.title', { ns: meta.profile.key }],
            description: ['space-invitation-toast.description', { ns: meta.profile.key }],
            actionLabel: ['join-space-invitation.label', { ns: meta.profile.key }],
            actionAlt: ['join-space-invitation.label', { ns: meta.profile.key }],
            closeLabel: ['dismiss-space-invitation.label', { ns: meta.profile.key }],
            onAction: () =>
              void joinSpaceInvitation(invoker, client.halo.inbox, invitation.spaceKey).catch((error) =>
                log.warn('failed to accept space invitation', { error }),
              ),
          })
          .then(({ error }) => error && log.warn('failed to add space invitation toast', { error }));
      }
    };

    // `client.halo` is replaced when the services reconnect, so the watch follows it.
    let unsubscribe = () => {};
    const watch = () => {
      unsubscribe();
      const subscriptions = [
        client.halo.inbox.notices.subscribe(announce),
        client.halo.contacts.subscribe(announce),
        client.spaces.subscribe(announce),
      ];
      unsubscribe = () => subscriptions.forEach((subscription) => subscription.unsubscribe());
      announce();
    };
    watch();
    const unsubscribeReloaded = client.reloaded.on(watch);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeReloaded();
        unsubscribe();
      }),
    );
    return [];
  }),
);
