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
// eslint-disable-next-line @dxos/rules/import-as-namespace
import type * as Settings$ from './Settings.ts';

export interface Sender {
  /**
   * Signs a message and relays it to a contact's inbox, identified by their identity DID.
   * Resolves once the relay accepted it, not once the recipient has seen it.
   */
  send(recipientDid: string, message: Message.Message): Effect.Effect<void, InboxSendError>;
}

/** Sends messages to other identities' notification panels; consumed by plugins, bots and `MessengerOperation.Send`. */
export const Sender = Capability.makeSingleton<Sender>()(`${meta.profile.key}.capability.sender`);

/**
 * The default space's notifications containers, the one every device writes to first; more than one
 * only until the materializer converges them, so readers union all of them.
 */
export const NotificationsContainers = Capability.makeSingleton<Atom.Atom<readonly Notifications.Notifications[]>>()(
  `${meta.profile.key}.capability.notificationsContainers`,
);

/** This device's messenger settings. */
export const Settings = Capability.makeSingleton<Atom.Writable<Settings$.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** Where this device stands on push; see `PushRegistration` in `#push`. */
/** `unconfirmed`: registered with EDGE, but the sample push never reached this device. */
export type PushStatus = 'unsupported' | 'off' | 'pending' | 'denied' | 'on' | 'unconfirmed' | 'failed';

export interface PushNotifications {
  status: Atom.Atom<PushStatus>;
  /** Why the last attempt failed, as the browser or EDGE put it; shown so a failure can be acted on. */
  error: Atom.Atom<string | undefined>;
  /** Opts this device in; call it from the user's click, since it may show the permission prompt. */
  enable(): Promise<PushStatus>;
  disable(): Promise<PushStatus>;
}

/** Push notifications for inbox notices on this device, registered with EDGE. */
export const PushNotifications = Capability.makeSingleton<PushNotifications>()(
  `${meta.profile.key}.capability.pushNotifications`,
);
