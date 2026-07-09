//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { JmapApiError } from '../../../errors';
import { MAIL_CAPABILITIES, SUBMISSION_CAPABILITIES, getMethodResponse, jmapRequest } from '../Jmap/api';
import {
  type EmailAddress,
  EmailGetResult,
  EmailQueryResult,
  EmailSetResult,
  EmailSubmissionSetResult,
  IdentityGetResult,
  MailboxGetResult,
} from './types';

/** Resolved per-request context: the session `apiUrl` and the mail account id. */
export type Target = {
  readonly apiUrl: string;
  readonly accountId: string;
};

/** Email properties fetched by {@link emailGet} — enough for the mapper to build a Message. */
export const EMAIL_PROPERTIES = [
  'id',
  'blobId',
  'threadId',
  'mailboxIds',
  'keywords',
  'from',
  'to',
  'cc',
  'subject',
  'receivedAt',
  'sentAt',
  'preview',
  'messageId',
  'inReplyTo',
  'references',
  'bodyValues',
  'textBody',
  'htmlBody',
] as const;

/** Lists all folders (mailboxes) in the account (RFC 8621 §2.3). */
export const mailboxGet = Effect.fn('mailboxGet')(function* (target: Target) {
  const response = yield* jmapRequest(target.apiUrl, {
    using: MAIL_CAPABILITIES,
    methodCalls: [['Mailbox/get', { accountId: target.accountId, ids: null }, '0']],
  });
  return yield* getMethodResponse(response, '0', MailboxGetResult);
});

/** Queries email ids matching a filter (RFC 8621 §4.4). */
export const emailQuery = Effect.fn('emailQuery')(function* (
  target: Target,
  options: {
    filter?: unknown;
    sort?: readonly { property: string; isAscending?: boolean }[];
    position?: number;
    limit?: number;
    calculateTotal?: boolean;
  } = {},
) {
  const args: Record<string, unknown> = { accountId: target.accountId };
  if (options.filter !== undefined) {
    args.filter = options.filter;
  }
  if (options.sort !== undefined) {
    args.sort = options.sort;
  }
  if (options.position !== undefined) {
    args.position = options.position;
  }
  if (options.limit !== undefined) {
    args.limit = options.limit;
  }
  if (options.calculateTotal !== undefined) {
    args.calculateTotal = options.calculateTotal;
  }

  const response = yield* jmapRequest(target.apiUrl, {
    using: MAIL_CAPABILITIES,
    methodCalls: [['Email/query', args, '0']],
  });
  return yield* getMethodResponse(response, '0', EmailQueryResult);
});

/** Fetches emails by id with decoded HTML and text body values (RFC 8621 §4.2). */
export const emailGet = Effect.fn('emailGet')(function* (
  target: Target,
  ids: readonly string[],
  properties: readonly string[] = EMAIL_PROPERTIES,
) {
  const response = yield* jmapRequest(target.apiUrl, {
    using: MAIL_CAPABILITIES,
    methodCalls: [
      [
        'Email/get',
        { accountId: target.accountId, ids, properties, fetchTextBodyValues: true, fetchHTMLBodyValues: true },
        '0',
      ],
    ],
  });
  return yield* getMethodResponse(response, '0', EmailGetResult);
});

/** Lists the account's sending identities (RFC 8621 §6.2). */
export const identityGet = Effect.fn('identityGet')(function* (target: Target) {
  const response = yield* jmapRequest(target.apiUrl, {
    using: SUBMISSION_CAPABILITIES,
    methodCalls: [['Identity/get', { accountId: target.accountId, ids: null }, '0']],
  });
  return yield* getMethodResponse(response, '0', IdentityGetResult);
});

/** Patches a single email (e.g. replace `mailboxIds` to move to Trash). Idempotent, so retryable. */
export const emailSetUpdate = Effect.fn('emailSetUpdate')(function* (
  target: Target,
  emailId: string,
  patch: Record<string, unknown>,
) {
  const response = yield* jmapRequest(target.apiUrl, {
    using: MAIL_CAPABILITIES,
    methodCalls: [['Email/set', { accountId: target.accountId, update: { [emailId]: patch } }, '0']],
  });
  const result = yield* getMethodResponse(response, '0', EmailSetResult);
  const error = result.notUpdated?.[emailId];
  if (error) {
    return yield* Effect.fail(new JmapApiError(undefined, error.description ?? error.type, error.type));
  }
  return result;
});

/**
 * Creates a draft and submits it for delivery in a single batched request. Not retried (a retry
 * could double-send). Returns the created email's id and thread id.
 */
export const submitEmail = Effect.fn('submitEmail')(function* (
  target: Target,
  args: {
    identityId: string;
    draftsMailboxId: string;
    sentMailboxId: string;
    draft: {
      from: readonly EmailAddress[];
      to: readonly EmailAddress[];
      cc?: readonly EmailAddress[];
      bcc?: readonly EmailAddress[];
      subject?: string;
      inReplyTo?: readonly string[];
      references?: readonly string[];
      text: string;
    };
  },
) {
  const { identityId, draftsMailboxId, sentMailboxId, draft } = args;
  const draftCreate: Record<string, unknown> = {
    mailboxIds: { [draftsMailboxId]: true },
    keywords: { $draft: true, $seen: true },
    from: draft.from,
    to: draft.to,
    bodyValues: { body: { value: draft.text } },
    textBody: [{ partId: 'body', type: 'text/plain' }],
  };
  if (draft.cc && draft.cc.length > 0) {
    draftCreate.cc = draft.cc;
  }
  if (draft.bcc && draft.bcc.length > 0) {
    draftCreate.bcc = draft.bcc;
  }
  if (draft.subject !== undefined) {
    draftCreate.subject = draft.subject;
  }
  if (draft.inReplyTo && draft.inReplyTo.length > 0) {
    draftCreate.inReplyTo = draft.inReplyTo;
  }
  if (draft.references && draft.references.length > 0) {
    draftCreate.references = draft.references;
  }

  const response = yield* jmapRequest(
    target.apiUrl,
    {
      using: SUBMISSION_CAPABILITIES,
      methodCalls: [
        ['Email/set', { accountId: target.accountId, create: { draft: draftCreate } }, '0'],
        [
          'EmailSubmission/set',
          {
            accountId: target.accountId,
            create: { sub: { emailId: '#draft', identityId } },
            onSuccessUpdateEmail: {
              '#sub': {
                [`mailboxIds/${draftsMailboxId}`]: null,
                [`mailboxIds/${sentMailboxId}`]: true,
                'keywords/$draft': null,
              },
            },
          },
          '1',
        ],
      ],
    },
    { retry: false },
  );

  const setResult = yield* getMethodResponse(response, '0', EmailSetResult);
  const created = setResult.created?.draft;
  if (!created) {
    const error = setResult.notCreated?.draft;
    return yield* Effect.fail(
      new JmapApiError(undefined, error?.description ?? error?.type ?? 'Draft was not created.', error?.type),
    );
  }

  const submissionResult = yield* getMethodResponse(response, '1', EmailSubmissionSetResult);
  if (!submissionResult.created?.sub) {
    const error = submissionResult.notCreated?.sub;
    return yield* Effect.fail(
      new JmapApiError(undefined, error?.description ?? error?.type ?? 'Email submission failed.', error?.type),
    );
  }

  return { id: created.id, threadId: created.threadId };
});
