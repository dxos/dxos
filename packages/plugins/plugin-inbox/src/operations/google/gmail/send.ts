//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';
// Connection and Message are referenced in the inferred type of this module's default export via
// InboxOperation.GmailSend's schema; the imports let TypeScript name them in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection } from '@dxos/plugin-connector';
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Message } from '@dxos/types';

import { GoogleMail } from '../../../apis';
import { GmailSendMessageInvalidError } from '../../../errors';
import { GoogleCredentials } from '../../../services/google-credentials';
import { InboxOperation, Mailbox } from '../../../types';

export default InboxOperation.GmailSend.pipe(
  Operation.withHandler(({ userId = 'me', message, connection: connectionRef }) =>
    Effect.gen(function* () {
      log('sending email', { userId, connection: connectionRef.uri });

      const to = message.properties?.to;
      const subject = message.properties?.subject;
      const cc = message.properties?.cc;
      const bcc = message.properties?.bcc;
      const inReplyTo = message.properties?.inReplyTo;
      const references = message.properties?.references;
      const threadId = message.properties?.threadId;
      const textBlock = message.blocks.find((block) => block._tag === 'text');
      const text = textBlock?._tag === 'text' ? textBlock.text : undefined;

      if (!to || !text) {
        return yield* Effect.fail(new GmailSendMessageInvalidError());
      }

      const headers = [
        `To: ${to}`,
        `Subject: ${subject ?? 'No Subject'}`,
        ...(cc ? [`Cc: ${cc}`] : []),
        ...(bcc ? [`Bcc: ${bcc}`] : []),
        ...(inReplyTo ? [`In-Reply-To: ${inReplyTo}`] : []),
        ...(references ? [`References: ${references}`] : []),
        'Content-Type: text/plain; charset=utf-8',
      ];
      const str = [...headers, '', text].join('\n');

      const raw = Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const response = yield* GoogleMail.sendMessage(userId, { raw, ...(threadId && { threadId }) });

      log('email sent', { id: response.id });

      return {
        id: response.id,
        threadId: response.threadId,
        // Gmail auto-applies its well-known `SENT` system label; the same tag the canonical copy syncs
        // down with, so the caller can tag the local draft to match.
        sentTag: { source: Mailbox.GMAIL_TAG_SOURCE, id: 'SENT', label: 'Sent' },
      };
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(GoogleCredentials.fromConnection(connectionRef))),
  ),
);
