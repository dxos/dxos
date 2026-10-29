//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import type * as AppPush from '@dxos/app-toolkit/AppPush';
import { type Message, SpaceInvitationMessage } from '@dxos/types';

// English only, and worded like composer-app's push worker (`describePushMessage`), so a notice reads the same
// whether it arrived as a push or was shown by the running app.

/** What Send test shows where the app shows its own notifications. */
export const TEST_NOTIFICATION: AppPush.LocalNotification = {
  title: 'Notifications are on',
  body: 'This is how Composer will tell you about invitations and messages.',
};

/** Sender-written text is capped so a long name cannot crowd out the rest of the notification. */
const MAX_NAME_LENGTH = 60;
const MAX_BODY_LENGTH = 140;

const clean = (value: unknown, max: number): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  // oxlint-disable-next-line no-control-regex
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

/** The notification for a message the inbox delivered. */
export const describeMessage = (message: Message.Message): AppPush.LocalNotification => {
  const sender = clean(message.sender.name, MAX_NAME_LENGTH);
  const invitation = Option.getOrUndefined(SpaceInvitationMessage.match(message));
  if (invitation) {
    const spaceName = clean(invitation.spaceName, MAX_NAME_LENGTH);
    return {
      title: spaceName ? `Invitation to ${spaceName}` : 'Space invitation',
      body: `${sender ?? 'A contact'} invited you to join.`,
    };
  }

  const subject = clean(message.properties?.subject, MAX_BODY_LENGTH);
  const firstText = clean(message.blocks.find((block) => block._tag === 'text')?.text, MAX_BODY_LENGTH);
  return {
    title: sender ?? 'New message',
    body: subject ?? firstText ?? 'You have a new message.',
  };
};

/** How far a sender's clock may run behind this device's and the message still count as sent while the app ran. */
const CLOCK_SKEW = 2 * 60_000;

export type ArrivalsOptions = {
  /** When this device started watching; messages sent earlier are the backlog it loads, not news. */
  since: number;
  /** Identifies a message across the copies different devices filed. */
  key: (message: Message.Message) => string;
};

/**
 * Picks the messages to notify for from each new notifications view: every unread message once, whichever device
 * filed it, as a push reaches every device.
 */
export const makeArrivals = ({ since, key }: ArrivalsOptions) => {
  const seen = new Set<string>();
  return ({ messages, read }: { messages: readonly Message.Message[]; read: ReadonlySet<string> }): Message.Message[] =>
    messages.filter((message) => {
      const messageKey = key(message);
      if (seen.has(messageKey)) {
        return false;
      }
      seen.add(messageKey);
      return !read.has(message.id) && Date.parse(message.created) >= since - CLOCK_SKEW;
    });
};
