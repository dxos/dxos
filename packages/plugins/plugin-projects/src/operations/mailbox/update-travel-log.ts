//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { ProjectMailboxOperation } from '#types';

import { findOrCreateDocumentArtifact, messagesAscending, setDocumentContent } from './helpers';

/** The artifact the pipeline owns; regenerated wholesale each run. */
export const TRAVEL_LOG_NAME = 'Travel Bookings';

// Travel-service signals in the subject or the sender address. Deliberately recall-leaning: the log
// lists candidates for review, it does not act on them.
const TRAVEL_SUBJECT_RE =
  /\b(flight|itinerar|booking|reservation|hotel|airline|boarding|e-?ticket|check[- ]?in|confirmation number|pnr|travel|trip)\b/i;
const TRAVEL_SENDER_RE = /(air|airline|airways|travel|booking|hotel|expedia|kayak|delta|united|lufthansa|klm|amtrak)/i;

/** Whether a message looks like mail from a travel service (booking, itinerary, check-in, …). */
export const isTravelMessage = (message: Message.Message): boolean => {
  const subject = typeof message.properties?.subject === 'string' ? message.properties.subject : '';
  const sender = message.sender?.email ?? '';
  return TRAVEL_SUBJECT_RE.test(subject) || TRAVEL_SENDER_RE.test(sender.split('@')[1] ?? '');
};

const row = (message: Message.Message): string => {
  const date = message.created.slice(0, 10);
  const subject = typeof message.properties?.subject === 'string' ? message.properties.subject : '(no subject)';
  const sender = message.sender?.name ?? message.sender?.email ?? 'unknown';
  return `| ${date} | ${subject.replaceAll('|', '\\|')} | ${sender.replaceAll('|', '\\|')} |`;
};

/**
 * Travel-log pipeline: filters the feed to travel-service mail and regenerates the project's
 * "Travel Bookings" document as a chronological table. Wholesale regeneration makes the operation
 * idempotent without a cursor — the document always reflects the current feed.
 */
const handler = ProjectMailboxOperation.UpdateTravelLog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ project: projectRef, mailbox: mailboxRef }) {
      const project = yield* Database.load(projectRef);
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const matched = messagesAscending(messages).filter(isTravelMessage);

      const document = yield* findOrCreateDocumentArtifact(project, TRAVEL_LOG_NAME);
      const content = [
        `# ${TRAVEL_LOG_NAME}`,
        '',
        `${matched.length} travel-related message(s) in ${mailbox.name ?? 'the mailbox'}.`,
        '',
        '| Date | Subject | From |',
        '| --- | --- | --- |',
        ...matched.map(row),
        '',
      ].join('\n');
      yield* setDocumentContent(document, content);

      yield* Effect.promise(() => db.flush());
      log.info('travel-log: done', { project: project.name, scanned: messages.length, matched: matched.length });
      return { scanned: messages.length, matched: matched.length };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
