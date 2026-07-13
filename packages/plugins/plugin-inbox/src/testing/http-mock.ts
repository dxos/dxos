//
// Copyright 2026 DXOS.org
//

import { type GmailDataset, type JmapDataset } from '../services';
import { generateGmailDataset } from './gmail-fixtures';
import { generateJmapDataset } from './jmap-fixtures';

// HTTP-level mock for the Gmail and JMAP provider APIs, driven by the same deterministic fixtures the
// unit suite uses. It answers the exact requests mailbox sync/send make, so a Playwright test can run
// the real client code with its network intercepted (via `page.route`) instead of hitting a provider.
// The handler is pure and synchronous — no server, no socket — so it slots straight into a route
// interceptor: parse the request, return a response, `route.fulfill`.

export type MockRequest = {
  method: string;
  /** Absolute request URL, e.g. `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=...`. */
  url: string;
  /** POST body as text, if any. */
  body?: string;
};

export type MockResponse = {
  status: number;
  contentType: string;
  body: string;
};

export type InboxHttpMockOptions = {
  /** Gmail fixture dataset; generated deterministically when omitted. */
  gmail?: GmailDataset;
  /** JMAP fixture dataset; generated deterministically when omitted. */
  jmap?: JmapDataset;
  /** Account email surfaced by JMAP `Identity/get` and Gmail `userinfo`. */
  account?: string;
};

export type InboxHttpMock = {
  gmail: GmailDataset;
  jmap: JmapDataset;
  /** Returns a response for a recognized Gmail/JMAP request, or `undefined` to let it pass through. */
  handle: (request: MockRequest) => MockResponse | undefined;
};

const JMAP_MAIL_CAPABILITY = 'urn:ietf:params:jmap:mail';

const json = (value: unknown, status = 200): MockResponse => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(value),
});

export const createInboxHttpMock = (options: InboxHttpMockOptions = {}): InboxHttpMock => {
  const gmail = options.gmail ?? generateGmailDataset();
  const jmap = options.jmap ?? generateJmapDataset();
  const account = options.account ?? jmap.session.username ?? 'me@example.com';
  const accountId = jmap.session.primaryAccounts[JMAP_MAIL_CAPABILITY];

  const handle = (request: MockRequest): MockResponse | undefined => {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // JMAP session discovery — any host, fixed well-known path.
    if (method === 'GET' && url.pathname === '/.well-known/jmap') {
      return json(jmap.session);
    }

    // JMAP API — POST to the session apiUrl.
    const apiUrl = new URL(jmap.session.apiUrl);
    if (method === 'POST' && url.hostname === apiUrl.hostname && url.pathname === apiUrl.pathname) {
      return handleJmap(request.body, { jmap, accountId, account });
    }

    // Gmail userinfo (connect flow) — different host.
    if (method === 'GET' && url.hostname === 'www.googleapis.com' && url.pathname === '/oauth2/v3/userinfo') {
      return json({ email: account });
    }

    // Gmail REST API.
    if (url.hostname === 'gmail.googleapis.com') {
      return handleGmail(method, url, request.body, gmail);
    }

    return undefined;
  };

  return { gmail, jmap, handle };
};

//
// Gmail
//

const GMAIL_PREFIX = '/gmail/v1/users/';

const handleGmail = (
  method: string,
  url: URL,
  body: string | undefined,
  dataset: GmailDataset,
): MockResponse | undefined => {
  if (!url.pathname.startsWith(GMAIL_PREFIX)) {
    return undefined;
  }
  // Strip `/gmail/v1/users/{userId}/` to get the resource path.
  const rest = url.pathname.slice(GMAIL_PREFIX.length).split('/').slice(1);

  // GET .../labels
  if (method === 'GET' && rest.length === 1 && rest[0] === 'labels') {
    return json({ labels: dataset.labels });
  }

  // POST .../messages/send
  if (method === 'POST' && rest.length === 2 && rest[0] === 'messages' && rest[1] === 'send') {
    const parsed = body ? (JSON.parse(body) as { threadId?: string }) : {};
    return json({ id: `sent-${dataset.messages.length}`, threadId: parsed.threadId ?? 'sent-thread', labelIds: ['SENT'] });
  }

  // POST .../messages/{id}/trash
  if (method === 'POST' && rest.length === 3 && rest[0] === 'messages' && rest[2] === 'trash') {
    const message = dataset.messages.find((entry) => entry.id === rest[1]);
    return message ? json(message) : json(gmailError(404, 'Not Found'), 404);
  }

  // GET .../messages/{id}/attachments/{attachmentId}
  if (method === 'GET' && rest.length === 4 && rest[0] === 'messages' && rest[2] === 'attachments') {
    const attachment = dataset.attachments?.[rest[3]];
    return attachment ? json(attachment) : json(gmailError(404, 'Not Found'), 404);
  }

  // GET .../messages/{id}
  if (method === 'GET' && rest.length === 2 && rest[0] === 'messages') {
    const message = dataset.messages.find((entry) => entry.id === rest[1]);
    return message ? json(message) : json(gmailError(404, 'Not Found'), 404);
  }

  // GET .../messages?q=&pageSize=&pageToken=
  if (method === 'GET' && rest.length === 1 && rest[0] === 'messages') {
    return json(listGmailMessages(dataset, url.searchParams));
  }

  return undefined;
};

const gmailError = (code: number, message: string) => ({ error: { code, message, status: message } });

/** Mirrors the in-memory mock: date-window filter on `internalDate`, descending sort, offset pagination. */
const listGmailMessages = (dataset: GmailDataset, params: URLSearchParams) => {
  const query = params.get('q') ?? '';
  const pageSize = Number.parseInt(params.get('pageSize') ?? '500', 10);
  const offset = Number.parseInt(params.get('pageToken') ?? '0', 10);
  const window = parseGmailDateWindow(query);

  const matching = dataset.messages
    .filter((message) => {
      const date = Number.parseInt(message.internalDate, 10);
      return (window.after === undefined || date >= window.after) && (window.before === undefined || date < window.before);
    })
    .sort((a, b) => Number.parseInt(b.internalDate, 10) - Number.parseInt(a.internalDate, 10));

  const page = matching.slice(offset, offset + pageSize);
  const nextOffset = offset + page.length;
  return {
    resultSizeEstimate: matching.length,
    messages: page.map((message) => ({ id: message.id, threadId: message.threadId })),
    // Omit the key entirely on the last page — sync loops `while (pageToken)`.
    ...(nextOffset < matching.length ? { nextPageToken: String(nextOffset) } : {}),
  };
};

/** Extracts `after:`/`before:` `YYYY/MM/DD` tokens from a Gmail `q` string into epoch-ms bounds. */
const parseGmailDateWindow = (query: string): { after?: number; before?: number } => {
  const parse = (token: string) => {
    const match = query.match(new RegExp(`${token}:(\\d{4})/(\\d{1,2})/(\\d{1,2})`));
    if (!match) {
      return undefined;
    }
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  return { after: parse('after'), before: parse('before') };
};

//
// JMAP
//

type JmapMethodCall = [method: string, args: any, callId: string];

const handleJmap = (
  body: string | undefined,
  context: { jmap: JmapDataset; accountId: string; account: string },
): MockResponse => {
  const request = body ? (JSON.parse(body) as { methodCalls: JmapMethodCall[] }) : { methodCalls: [] };
  const methodResponses = request.methodCalls.map(([name, args, callId]): JmapMethodCall => {
    const result = invokeJmapMethod(name, args, context);
    return [result ? name : 'error', result ?? { type: 'unknownMethod' }, callId];
  });
  return json({ methodResponses, sessionState: 'mock' });
};

const invokeJmapMethod = (
  name: string,
  args: any,
  { jmap, accountId, account }: { jmap: JmapDataset; accountId: string; account: string },
): any => {
  switch (name) {
    case 'Mailbox/get':
      return { accountId, state: 'mock', list: jmap.folders, notFound: null };

    case 'Email/query': {
      const matching = jmap.emails
        .filter((email) => matchesJmapFilter(email, args.filter))
        .sort(sortByReceivedAt(args.sort));
      const position = args.position ?? 0;
      const limit = args.limit ?? matching.length;
      const page = matching.slice(position, position + limit);
      return { accountId, queryState: 'mock', position, total: matching.length, limit, ids: page.map((email) => email.id) };
    }

    case 'Email/get': {
      const ids: string[] = args.ids ?? [];
      const byId = new Map(jmap.emails.map((email) => [email.id, email]));
      return { accountId, state: 'mock', list: ids.map((id) => byId.get(id)).filter(Boolean), notFound: null };
    }

    case 'Identity/get':
      return { accountId, state: 'mock', list: [{ id: 'identity-1', name: account, email: account }], notFound: null };

    case 'Email/set':
      // Send flow: acknowledge the created draft with a synthetic id/thread.
      if (args.create) {
        const created = Object.fromEntries(
          Object.keys(args.create).map((key) => [key, { id: `sent-${key}`, blobId: `blob-${key}`, threadId: `sent-thread-${key}`, size: 0 }]),
        );
        return { accountId, oldState: 'mock', newState: 'mock', created };
      }
      return { accountId, oldState: 'mock', newState: 'mock', updated: {} };

    case 'EmailSubmission/set': {
      const created = Object.fromEntries(Object.keys(args.create ?? {}).map((key) => [key, { id: `submission-${key}` }]));
      return { accountId, newState: 'mock', created };
    }

    default:
      return undefined;
  }
};

/** Mirrors the in-memory mock's recursive filter: AND/OR/NOT + after/before/inMailbox(OtherThan) leaves. */
const matchesJmapFilter = (email: JmapDataset['emails'][number], filter: any): boolean => {
  if (!filter) {
    return true;
  }
  if (filter.operator) {
    const conditions: any[] = filter.conditions ?? [];
    switch (filter.operator) {
      case 'AND':
        return conditions.every((condition) => matchesJmapFilter(email, condition));
      case 'OR':
        return conditions.some((condition) => matchesJmapFilter(email, condition));
      case 'NOT':
        return !conditions.some((condition) => matchesJmapFilter(email, condition));
      default:
        return true;
    }
  }

  const receivedAt = Date.parse(email.receivedAt);
  if (filter.after !== undefined && receivedAt < Date.parse(filter.after)) {
    return false;
  }
  if (filter.before !== undefined && receivedAt >= Date.parse(filter.before)) {
    return false;
  }
  const mailboxIds = Object.keys(email.mailboxIds ?? {});
  if (filter.inMailbox !== undefined && !mailboxIds.includes(filter.inMailbox)) {
    return false;
  }
  if (filter.inMailboxOtherThan !== undefined) {
    const excluded: string[] = filter.inMailboxOtherThan;
    if (!mailboxIds.some((id) => !excluded.includes(id))) {
      return false;
    }
  }
  return true;
};

const sortByReceivedAt =
  (sort: Array<{ property: string; isAscending?: boolean }> | undefined) =>
  (a: JmapDataset['emails'][number], b: JmapDataset['emails'][number]): number => {
    const ascending = sort?.find((entry) => entry.property === 'receivedAt')?.isAscending ?? false;
    const delta = Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
    return ascending ? delta : -delta;
  };
