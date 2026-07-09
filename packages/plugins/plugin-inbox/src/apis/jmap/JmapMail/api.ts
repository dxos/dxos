//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';

import { withAuthorization } from '@dxos/functions';

import { JmapApiError } from '../../../errors';
import { JmapCredentials } from '../../../services/jmap-credentials';
import {
  MAIL_CAPABILITIES,
  REQUEST_RETRY,
  REQUEST_TIMEOUT,
  SUBMISSION_CAPABILITIES,
  getMethodResponse,
  jmapRequest,
  shouldRetry,
} from '../Jmap/api';
import {
  type EmailAddress,
  EmailGetResult,
  EmailQueryResult,
  EmailSetResult,
  EmailSubmissionSetResult,
  IdentityGetResult,
  MailboxGetResult,
} from './types';

/**
 * Resolved per-request context: the session `apiUrl`, the mail account id, and (optionally) the
 * session's blob `downloadUrl` template (RFC 8620 §6.2). Most operations (mailboxGet, emailQuery,
 * send, delete, …) don't need it and construct a `Target` without it; only the attachment-fetching
 * path populates it from `Jmap.Session.downloadUrl`, so {@link downloadBlob} is the sole consumer
 * that requires it — absent here just means "this call site never populated it", not "the server
 * didn't advertise one" (every real session does).
 */
export type Target = {
  readonly apiUrl: string;
  readonly accountId: string;
  readonly downloadUrl?: string;
};

/** Expands a JMAP `downloadUrl` URI Template (RFC 6570 level 1) with the given variables. */
const expandDownloadUrl = (
  template: string,
  variables: { accountId: string; blobId: string; type: string; name: string },
): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in variables ? encodeURIComponent(variables[key as keyof typeof variables]) : '',
  );

/**
 * Downloads a blob's raw bytes via the session's `downloadUrl` template. `name`/`type` are advisory
 * (they only affect the response's `Content-Disposition`/`Accept`), not required for correctness.
 */
export const downloadBlob = Effect.fn('downloadBlob')(function* (
  target: Target,
  blobId: string,
  options: { name?: string; type?: string } = {},
) {
  if (!target.downloadUrl) {
    return yield* Effect.fail(new JmapApiError(undefined, 'Session has no downloadUrl.'));
  }
  const url = expandDownloadUrl(target.downloadUrl, {
    accountId: target.accountId,
    blobId,
    name: options.name ?? blobId,
    type: options.type ?? 'application/octet-stream',
  });

  const { token } = yield* JmapCredentials;
  const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(withAuthorization(token, 'Bearer')));

  // Mapped to `JmapApiError` inside the per-attempt pipeline (before `Effect.retry`) so `shouldRetry`
  // can actually distinguish a permanent 4xx from a transient failure — mirrors `jmapRequest`.
  const executed = HttpClientRequest.get(url).pipe(
    httpClient.execute,
    Effect.flatMap((response) => response.arrayBuffer),
    Effect.mapError(asJmapDownloadError),
    Effect.timeout(REQUEST_TIMEOUT),
  );

  const buffer = yield* executed.pipe(
    Effect.retry({ schedule: REQUEST_RETRY, while: shouldRetry }),
    Effect.scoped,
    Effect.mapError(asJmapDownloadError),
  );
  return new Uint8Array(buffer);
});

/** Collapses transport/decode failures into a typed {@link JmapApiError} (mirrors `Jmap/api.ts`). */
const asJmapDownloadError = (error: unknown): JmapApiError =>
  error instanceof JmapApiError
    ? error
    : new JmapApiError(undefined, error instanceof Error ? error.message : String(error));

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
  'attachments',
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
