//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { Smtp } from '@dxos/functions';
import { log } from '@dxos/log';

import { resolveSmtpAuth } from '../../services/smtp-credentials';
import { InboxOperation } from '../../types';

const splitAddresses = (raw: string | undefined): string[] => {
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => {
      const trimmed = s.trim();
      const angle = trimmed.match(/<([^>]+)>/);
      return angle ? angle[1] : trimmed;
    })
    .filter((s) => s.length > 0);
};

const generateMessageId = (account: string | undefined): string => {
  const host = account?.split('@')[1] ?? 'localhost';
  const random = crypto.randomUUID().replace(/-/g, '');
  return `<${random}@${host}>`;
};

/**
 * Compose RFC 5322 from the Message object and submit via SMTP. Returns the
 * generated Message-ID as the `id`; reuses `properties.threadId` or generates
 * a fresh one mirroring Gmail's `{ id, threadId }` shape.
 *
 * Runs remotely on the edge runtime — `Smtp` is provided by `SmtpLive` from
 * `@dxos/plugin-inbox/mail-live` when this handler executes on Cloudflare
 * Workers via `compute-intrinsics`. Local invocation falls back to
 * `SmtpUnavailable` and surfaces a clear error.
 */
export default InboxOperation.SmtpSend.pipe(
  Operation.withHandler(
    ({ message, integration: integrationRef }) =>
      Effect.gen(function* () {
        const integration = yield* Database.load(integrationRef);
        const primaryToken = integration.accessTokens[0];
        const from = primaryToken ? (yield* Database.load(primaryToken)).account : undefined;
        if (!from) {
          return yield* Effect.fail(new Error('SMTP send requires an account email on the primary AccessToken.'));
        }

        const to = splitAddresses(message.properties?.to);
        const cc = splitAddresses(message.properties?.cc);
        const bcc = splitAddresses(message.properties?.bcc);
        const recipients = [...to, ...cc, ...bcc];
        const subject = message.properties?.subject ?? '(No subject)';
        const inReplyTo = message.properties?.inReplyTo;
        const references = message.properties?.references;
        const text = message.blocks.find((b) => b._tag === 'text')?.text;

        if (recipients.length === 0 || !text) {
          return yield* Effect.fail(new Error('SMTP send requires at least one recipient and a text body.'));
        }

        const messageId = generateMessageId(from);
        const dateHeader = new Date().toUTCString().replace(/GMT$/, '+0000');
        const headers: string[] = [
          `From: ${from}`,
          `To: ${to.join(', ')}`,
          ...(cc.length ? [`Cc: ${cc.join(', ')}`] : []),
          `Subject: ${subject}`,
          `Date: ${dateHeader}`,
          `Message-ID: ${messageId}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8',
          'Content-Transfer-Encoding: 8bit',
        ];
        if (inReplyTo) {
          headers.push(`In-Reply-To: ${inReplyTo}`);
          headers.push(`References: ${references ? `${references} ${inReplyTo}` : inReplyTo}`);
        }
        const rfc822 = headers.join('\r\n') + '\r\n\r\n' + text;

        log('smtp send', { from, recipientCount: recipients.length, messageId });

        const auth = yield* resolveSmtpAuth(integrationRef);
        yield* Smtp.send(auth, { from, to: recipients, rfc822 });

        return {
          id: messageId,
          threadId: message.properties?.threadId ?? messageId,
        };
      }),
    // `Smtp` is provided by the surrounding runtime: composer-side wires SmtpUnavailable
    // (fails-fast), Workers-side function bundles wire SmtpLive.
  ),
);
