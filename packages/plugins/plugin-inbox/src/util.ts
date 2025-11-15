//
// Copyright 2024 DXOS.org
//

import { format, formatDistance, isThisWeek, isToday } from 'date-fns';

import { type Message } from '@dxos/types';
import { toHue } from '@dxos/util';

/**
 * Hashes a string into a number
 * @param str String to hash
 * @returns A non-negative number hash
 */
// TODO(burdon): Factor out.
export const hashString = (str?: string): number => {
  return str ? Math.abs(str.split('').reduce((hash, char) => (hash << 5) + hash + char.charCodeAt(0), 0)) : 0;
};

// TODO(burdon): Factor out sort pattern with getters.
export const sortByCreated =
  <T, K extends Extract<keyof T, string>>(prop: K, descending = false) =>
  (a: T & Record<K, string>, b: T & Record<K, string>) =>
    descending ? b[prop].localeCompare(a[prop]) : a[prop].localeCompare(b[prop]);

export const formatDateTime = (date: Date, now: Date, compact = false) =>
  isToday(date)
    ? format(date, 'hh:mm aaa')
    : compact
      ? formatShortDate(date)
      : formatDistance(date, now, { addSuffix: true });

export const formatShortDate = (date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : isThisWeek(date) ? format(date, 'EEEE') : format(date, 'MMM d');

type MessageProps = {
  id: string;
  text: string;
  date: string;
  from?: string;
  email?: string;
  subject: string;
  snippet: string;
  hue: string;
};

export const getMessageProps = (message: Message.Message, now: Date = new Date(), compact = false): MessageProps => {
  const id = message.id;
  // Always use the first text block for display in the mailbox list.
  const textBlocks = message.blocks.filter((block) => 'text' in block);
  const text = textBlocks[0]?.text || '';
  const date = formatDateTime(message.created ? new Date(message.created) : new Date(), now, compact);
  const from = message.sender?.contact?.target?.fullName ?? message.sender?.name;
  const email = message.sender?.email;
  const subject = message.properties?.subject;
  const snippet = message.properties?.snippet ?? textBlocks[0]?.text;
  const hue = toHue(hashString(from));
  return { id, text, date, from, email, subject, snippet, hue };
};
