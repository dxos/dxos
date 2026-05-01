//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';

import { GoogleMail } from '../../../apis';
import { GmailSendMessageInvalidError } from '../../../errors';
import { GoogleCredentials } from '../../../services/google-credentials';
import { GmailSend } from '../../definitions';

export default GmailSend.pipe(
  Operation.withHandler(({ userId = 'me', message, integration: integrationRef }) =>
    Effect.gen(function* () {
      log('sending email', { userId, integration: integrationRef.dxn.toString() });

      const to = message.properties?.to;
      const subject = message.properties?.subject;
      const cc = message.properties?.cc;
      const bcc = message.properties?.bcc;
      const inReplyTo = message.properties?.inReplyTo;
      const references = message.properties?.references;
      const threadId = message.properties?.threadId;
      const text = message.blocks.find((b) => b._tag === 'text')?.text;

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
      };
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(GoogleCredentials.fromIntegration(integrationRef))),
  ),
);
