//
// Copyright 2024 DXOS.org
//

import { format, formatDistance, isThisWeek, isToday } from 'date-fns';

// https://date-fns.org/v2.29.3/docs/format

export const formatDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : formatDistance(date, now, { addSuffix: true });

export const formatShortDate = (now: Date, date: Date) =>
  isToday(date) ? format(date, 'hh:mm aaa') : isThisWeek(date) ? format(date, 'EEEE') : format(date, 'MMM d');

/**
 * Hashes a string into a number
 * @param str String to hash
 * @returns A non-negative number hash
 */
export const hashString = (str?: string): number => {
  if (!str) {
    return 0;
  }
  return Math.abs(str.split('').reduce((hash, char) => (hash << 5) + hash + char.charCodeAt(0), 0));
};

import { type DataType } from '@dxos/schema';
import { toHue } from '@dxos/util';

export const getMessageProps = (message: DataType.Message, now: Date = new Date()) => {
  const id = message.id;
  // Always use the first text block for display in the mailbox list.
  const textBlocks = message.blocks.filter((block) => 'text' in block);
  const text = textBlocks[0]?.text || '';
  const date = formatDate(now, message.created ? new Date(message.created) : new Date());
  const from = message.sender?.contact?.target?.fullName ?? message.sender?.name ?? message.sender?.email;
  const subject = message.properties?.subject ?? text;
  const hue = toHue(hashString(from));
  return { id, text, date, subject, hue, from };
};
