//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { log } from '@dxos/log';

import { Jmap, JmapMail } from '../../../../apis';
import { JmapApiError, JmapSendIdentityNotFoundError, JmapSendMessageInvalidError } from '../../../../errors';
import { JmapCredentials } from '../../../../services';
import { InboxOperation } from '../../../../types';
import { JMAP_TAG_SOURCE } from '../tags';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

export default InboxOperation.JmapSend.pipe(
  Operation.withHandler(({ message, connection: connectionRef }) =>
    Effect.gen(function* () {
      log('sending email via jmap', { connection: connectionRef.uri });

      const to = message.properties?.to;
      const cc = message.properties?.cc;
      const bcc = message.properties?.bcc;
      const subject = message.properties?.subject;
      const inReplyTo = message.properties?.inReplyTo;
      const references = message.properties?.references;
      const textBlock = message.blocks.find((block) => block._tag === 'text');
      const text = textBlock?._tag === 'text' ? textBlock.text : undefined;

      if (!to || !text) {
        return yield* Effect.fail(new JmapSendMessageInvalidError());
      }

      const session = yield* Jmap.getSession;
      const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
      if (!accountId) {
        return yield* Effect.fail(new JmapApiError(undefined, 'JMAP session has no mail account.'));
      }
      const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId };

      const credentials = yield* JmapCredentials;
      const account = credentials.account ?? session.username;

      // The submission requires an identity whose email the server permits as `from`; pick the one
      // matching the connection account (fall back to the first if the account is unknown).
      const { list: identities } = yield* JmapMail.identityGet(target);
      const identity = account
        ? identities.find((candidate) => candidate.email.toLowerCase() === account.toLowerCase())
        : identities[0];
      if (!identity) {
        return yield* Effect.fail(new JmapSendIdentityNotFoundError(account));
      }

      const { list: folders } = yield* JmapMail.mailboxGet(target);
      const drafts = folders.find((folder) => folder.role === 'drafts');
      const sent = folders.find((folder) => folder.role === 'sent');
      if (!drafts || !sent) {
        return yield* Effect.fail(new JmapApiError(undefined, 'JMAP account is missing a Drafts or Sent folder.'));
      }

      const fromAddress = identity.name ? { email: identity.email, name: identity.name } : { email: identity.email };

      const result = yield* JmapMail.submitEmail(target, {
        identityId: identity.id,
        draftsMailboxId: drafts.id,
        sentMailboxId: sent.id,
        draft: {
          from: [fromAddress],
          to: parseAddressList(to),
          ...(cc ? { cc: parseAddressList(cc) } : {}),
          ...(bcc ? { bcc: parseAddressList(bcc) } : {}),
          ...(subject ? { subject } : {}),
          ...(inReplyTo ? { inReplyTo: [inReplyTo] } : {}),
          ...(references ? { references: splitReferences(references) } : {}),
          text,
        },
      });

      log('email sent via jmap', { id: result.id });
      return {
        id: result.id,
        threadId: result.threadId ?? '',
        // The Sent folder the submission filed the message into; the same tag its canonical synced copy
        // will carry, so the caller can tag the local draft to match.
        sentTag: { source: JMAP_TAG_SOURCE, id: sent.id, label: sent.name },
      };
    }).pipe(Effect.provide(FetchHttpClient.layer), Effect.provide(JmapCredentials.fromConnection(connectionRef))),
  ),
  Operation.opaqueHandler,
);

/** Parses a comma-separated header value into JMAP structured addresses. */
const parseAddressList = (value: string): { email: string; name?: string }[] =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseAddress);

/** Parses a single `"Name <email>"` (or bare `email`) into a JMAP structured address. */
const parseAddress = (value: string): { email: string; name?: string } => {
  const match = value.match(/^\s*(?:"?([^"<]*?)"?\s+)?<([^>]+)>\s*$/);
  if (match) {
    const name = match[1]?.trim();
    const email = match[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: value.trim() };
};

/** Splits a `References` header (whitespace-separated message ids) into an array. */
const splitReferences = (value: string): string[] => value.split(/\s+/).filter(Boolean);
