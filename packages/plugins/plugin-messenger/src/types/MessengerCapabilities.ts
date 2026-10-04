//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { type InboxSendError } from './errors.ts';
import * as Notifications from './Notifications.ts';

export interface Sender {
  /**
   * Signs a message and relays it to a contact's inbox, identified by their identity DID.
   * Resolves once the relay accepted it, not once the recipient has seen it.
   */
  send(recipientDid: string, message: Message.Message): Effect.Effect<void, InboxSendError>;
}

/** Sends messages to other identities' notification panels; consumed by plugins, bots and `MessengerOperation.Send`. */
export const Sender = Capability.makeSingleton<Sender>()(`${meta.profile.key}.capability.sender`);

/** The default space's notifications container, once the space is ready and the container exists. */
export const NotificationsContainer = Capability.makeSingleton<Atom.Atom<Notifications.Notifications | undefined>>()(
  `${meta.profile.key}.capability.notificationsContainer`,
);
