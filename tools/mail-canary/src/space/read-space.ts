//
// Copyright 2026 DXOS.org
//

/** Operation the space's mail sync trigger runs (plugin-google `GoogleOperation.GoogleMailSync`). */
export const SYNC_OPERATION_KEY = 'org.dxos.operation.google.syncMail';

/** Foreign-key source the Gmail mapper stamps on every synced message (plugin-google `GMAIL_SOURCE`). */
export const GMAIL_SOURCE = 'com.google.mail';

/** Kind of the space's Execution Trace feed (compute-runtime `TRACE_FEED_KIND`). */
export const TRACE_FEED_KIND = 'dxos.org.feed.trace';

// Feed rows per query; small, since a query response over 32 MiB fails on EDGE.
const PAGE_SIZE = 50;

export type ReadSpaceParams = {
  /** Read trace events back to this epoch millisecond. */
  readonly since: number;
  /** Most mailbox-feed messages to read, newest first. */
  readonly maxMessages: number;
};

/**
 * The program `dx eval` runs in the canary space, in the code-mode Effect dialect (`Database`,
 * `Filter`, `Query`, `Order`, `Obj`, `DXN` and `print` in scope). It prints one JSON line shaped as a
 * `SpaceSnapshot`.
 *
 * Feeds are read newest first in small pages, as sync's own dedup seed reads them: a feed query has no
 * filter pushdown yet, so a foreign-key filter would decode the whole feed.
 */
export const readSpaceProgram = (params: ReadSpaceParams): string => `
const params = ${JSON.stringify({ ...params, pageSize: PAGE_SIZE })};
const syncKey = ${JSON.stringify(SYNC_OPERATION_KEY)};
const gmailSource = ${JSON.stringify(GMAIL_SOURCE)};

const page = (feed, typename, read) =>
  Database.query(
    Query.select(Filter.type(DXN.make(typename)))
      .orderBy(Order.natural('desc'))
      .skip(read)
      .limit(params.pageSize)
      .from(feed),
  ).run;

const [mailbox] = yield* Database.query(Filter.type(DXN.make('org.dxos.type.mailbox'))).run;
const messages = [];
if (mailbox) {
  const feed = yield* Database.load(mailbox.feed);
  for (let read = 0; read < params.maxMessages; read += params.pageSize) {
    const rows = yield* page(feed, 'org.dxos.type.message', read);
    for (const message of rows) {
      const key = Obj.getMeta(message).keys.find((entry) => entry.source === gmailSource);
      if (key) {
        messages.push({ gmailId: key.id, subject: message.properties?.subject, sender: message.sender?.email });
      }
    }
    if (rows.length < params.pageSize) {
      break;
    }
  }
}

const [traceFeed] = yield* Database.query(
  Query.select(Filter.type(DXN.make('org.dxos.type.feed'), { kind: ${JSON.stringify(TRACE_FEED_KIND)} })),
).run;
const events = [];
if (traceFeed) {
  for (let read = 0; ; read += params.pageSize) {
    const rows = yield* page(traceFeed, 'org.dxos.type.traceMessage', read);
    let older = 0;
    for (const message of rows) {
      for (const event of message.events ?? []) {
        if (event.timestamp < params.since) {
          older++;
          continue;
        }
        const isSync = String(event.data?.key ?? '').includes(syncKey);
        if (isSync && (event.type === 'operation.start' || event.type === 'operation.end')) {
          events.push({
            pid: message.meta?.pid ?? message.id,
            type: event.type === 'operation.start' ? 'start' : 'end',
            timestamp: event.timestamp,
            outcome: event.data?.outcome,
            error: event.data?.error,
            errorCode: event.data?.errorCode,
          });
        }
      }
    }
    // Newest first, so a page that reached past the window ends the read.
    if (rows.length < params.pageSize || older > 0) {
      break;
    }
  }
}

// The canary space holds one remote timer trigger: the mail sync routine's.
const triggers = (yield* Database.query(Filter.type(DXN.make('org.dxos.type.trigger'))).run)
  .filter((trigger) => trigger.spec?.kind === 'timer' && trigger.remote === true)
  .map((trigger) => ({ id: trigger.id, enabled: trigger.enabled === true }));

yield* print(JSON.stringify({ events, messages, triggers, mailboxFound: Boolean(mailbox), traceFeedFound: Boolean(traceFeed) }));
`;
