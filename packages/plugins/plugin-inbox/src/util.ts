//
// Copyright 2024 DXOS.org
//

import { format, formatDistance, isThisWeek, isToday } from 'date-fns';

import { type Obj } from '@dxos/echo';
import { type Message } from '@dxos/types';
import { toHue } from '@dxos/util';

export type CreateDraftOptions = {
  mode?: 'compose' | 'reply' | 'reply-all' | 'forward';
  replyToMessage?: Message.Message;
  subject?: string;
  body?: string;
};

const formatQuotedBody = (message: Message.Message): string => {
  const textBlock = message.blocks.find((b) => b._tag === 'text');
  const originalText = textBlock?.text ?? '';
  const senderName = message.sender?.name ?? message.sender?.email ?? 'Unknown';
  const date = message.created ? new Date(message.created).toLocaleString() : '';
  return `\n\n---\nOn ${date}, ${senderName} wrote:\n\n${originalText}`;
};

/**
 * Builds draft message make-props for Obj.make(Message.Message, ...).
 * Used when creating a draft locally and adding via SpaceOperation.AddObject.
 */
export const buildDraftMessageProps = (options: CreateDraftOptions): Obj.MakeProps<typeof Message.Message> => {
  const { mode = 'compose', replyToMessage, subject = '', body = '' } = options;

  let to = '';
  let cc: string | undefined;
  let draftSubject = subject;
  let draftBody = body;
  const properties: Record<string, unknown> = {};

  if (replyToMessage && mode !== 'compose') {
    const originalSubject = replyToMessage.properties?.subject ?? '';
    const quotedBody = formatQuotedBody(replyToMessage);

    switch (mode) {
      case 'reply': {
        to = replyToMessage.sender?.email ?? '';
        draftSubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
        draftBody = quotedBody;
        break;
      }
      case 'reply-all': {
        to = replyToMessage.sender?.email ?? '';
        const originalTo = replyToMessage.properties?.to ?? '';
        const originalCc = replyToMessage.properties?.cc ?? '';
        const senderEmail = replyToMessage.sender?.email ?? '';
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
    if (replyToMessage.properties) {
      if (replyToMessage.properties.threadId) {
        properties.threadId = replyToMessage.properties.threadId;
      }
      const originalMsgId = replyToMessage.properties.messageId;
      if (originalMsgId) {
        properties.inReplyTo = originalMsgId;
        const existingRefs = replyToMessage.properties.references ?? '';
        properties.references = [existingRefs, originalMsgId].filter(Boolean).join(' ');
      }
    }
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
