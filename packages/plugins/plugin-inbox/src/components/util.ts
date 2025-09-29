//
// Copyright 2024 DXOS.org
//

import { format, formatDistance, isThisWeek, isToday } from 'date-fns';

import { type DataType } from '@dxos/schema';
import { toHue } from '@dxos/util';

export const formatDateTime = (date: Date, now: Date, compact = false) =>
  isToday(date)
    ? format(date, 'hh:mm aaa')
    : compact
      ? formatShortDate(date)
      : formatDistance(date, now, { addSuffix: true });

export const formatShortDate = (date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : isThisWeek(date) ? format(date, 'EEEE') : format(date, 'MMM d');

/**
 * Hashes a string into a number
 * @param str String to hash
 * @returns A non-negative number hash
 */
export const hashString = (str?: string): number => {
  return str ? Math.abs(str.split('').reduce((hash, char) => (hash << 5) + hash + char.charCodeAt(0), 0)) : 0;
};

export const getMessageProps = (message: DataType.Message, now: Date = new Date(), compact = false) => {
  const id = message.id;
  // Always use the first text block for display in the mailbox list.
  const textBlocks = message.blocks.filter((block) => 'text' in block);
  const text = textBlocks[0]?.text || '';
  const date = formatDateTime(message.created ? new Date(message.created) : new Date(), now, compact);
  const from = message.sender?.contact?.target?.fullName ?? message.sender?.name;
  const email = message.sender?.email;
  const hue = toHue(hashString(from));
  const subject = message.properties?.subject;
  const snippet = message.properties?.snippet ?? textBlocks[0]?.text;
  return { id, text, date, from, email, hue, subject, snippet };
};
