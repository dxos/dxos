//
// Copyright 2024 DXOS.org
//

import { format, formatDistance, isThisWeek, isToday } from 'date-fns';

import { Obj } from '@dxos/echo';
import { type Message } from '@dxos/types';
import { toHue } from '@dxos/util';

import { type Mailbox } from '#types';

export const REPLY_DELIMITER = '\n\n---';
export const REPLY_REGEXP = /^---\s*$/m;

export const formatQuotedMessage = (message: Message.Message): string => {
  const textBlock = message.blocks.find((b) => b._tag === 'text');
  const originalText = textBlock?.text ?? '';
  const senderName = message.sender?.name ?? message.sender?.email ?? 'Unknown';
  const date = message.created ? new Date(message.created).toLocaleString() : '';
  return `${REPLY_DELIMITER}\nOn ${date}, ${senderName} wrote:\n\n${originalText}`;
};

export const stripQuotedMessage = (content: string): string => {
  const match = REPLY_REGEXP.exec(content);
  return match ? content.slice(0, match.index) : content;
};

export type CreateDraftOptions = {
  mode?: 'compose' | 'reply' | 'reply-all' | 'forward';
  message?: Message.Message;
  subject?: string;
  body?: string;
  mailbox?: Mailbox.Mailbox;
};

/**
 * Builds draft message make-props for Obj.make(Message.Message, ...).
 * Used when creating a draft locally and adding via SpaceOperation.AddObject.
 */
export const createDraftMessage = (options: CreateDraftOptions): Obj.MakeProps<typeof Message.Message> => {
  const { mode = 'compose', message, subject = '', body = '', mailbox } = options;

  let to = '';
  let cc: string | undefined;
  let draftSubject = subject;
  let draftBody = body;
  const properties: Record<string, unknown> = {};

  if (message && mode !== 'compose') {
    const originalSubject = message.properties?.subject ?? '';
    const quotedBody = formatQuotedMessage(message);

    switch (mode) {
      case 'reply': {
        to = message.sender?.email ?? '';
        draftSubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        draftBody = quotedBody;
        break;
      }

      case 'reply-all': {
        to = message.sender?.email ?? '';
        const originalTo = message.properties?.to ?? '';
        const originalCc = message.properties?.cc ?? '';
        const senderEmail = message.sender?.email ?? '';
        const allRecipients = [originalTo, originalCc]
          .flatMap((r: string) => r.split(',').map((e: string) => e.trim()))
          .filter((r: string) => r && r !== senderEmail);
        cc = allRecipients.join(', ') || undefined;
        draftSubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        draftBody = quotedBody;
        break;
      }

      case 'forward': {
        draftSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;
        draftBody = quotedBody;
        break;
      }
    }

    // Set threading headers on the draft so send can use them directly.
    if (message.properties) {
      if (message.properties.threadId) {
        properties.threadId = message.properties.threadId;
      }

      const originalMsgId = message.properties.messageId;
      if (originalMsgId) {
        properties.inReplyTo = originalMsgId;
        const existingRefs = message.properties.references ?? '';
        properties.references = [existingRefs, originalMsgId].filter(Boolean).join(' ');
      }
    }
  }

  if (mailbox && Obj.isObject(mailbox)) {
    properties.mailbox = Obj.getDXN(mailbox).toString();
  }

  return {
    created: new Date().toISOString(),
    sender: { name: 'Me' },
    blocks: [{ _tag: 'text' as const, text: draftBody }],
    properties: {
      to,
      ...(cc !== undefined && { cc }),
      subject: draftSubject,
      ...properties,
    },
  };
};

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

export type FormatDateTimeOptions = { compact?: boolean; time?: boolean };

export const formatDateTime = (date: Date, now: Date, options?: FormatDateTimeOptions) =>
  isToday(date)
    ? format(date, 'hh:mm aaa')
    : options?.time
      ? format(date, 'MMM d, h:mm aaa')
      : options?.compact
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

export const getMessageProps = (
  message: Message.Message,
  now: Date = new Date(),
  options?: FormatDateTimeOptions,
): MessageProps => {
  const id = message.id;
  // Always use the first text block for display in the mailbox list.
  const textBlocks = message.blocks.filter((block) => 'text' in block);
  const text = textBlocks[0]?.text || '';
  const date = formatDateTime(message.created ? new Date(message.created) : new Date(), now, options);
  const from = message.sender?.contact?.target?.fullName ?? message.sender?.name;
  const email = message.sender?.email;
  const subject = message.properties?.subject;
  const snippet = message.properties?.snippet ?? textBlocks[0]?.text;
  const hue = toHue(hashString(from));
  return { id, text, date, from, email, subject, snippet, hue };
};

/**
 * Markdown representation of a message.
 */
export const renderMarkdown = (message: Message.Message): string[] => {
  const sender =
    message.sender.contact?.target?.fullName ??
    message.sender.name ??
    message.sender.email ??
    message.sender.identityDid;
  const blocks = message.blocks.filter((block) => block._tag === 'text');
  return [
    // prettier-ignore
    `###### ${sender}`,
    `*${message.created}*`,
    blocks.map((block) => block.text.trim()).join(' '),
    '',
  ];
};
