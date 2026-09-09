//
// Copyright 2026 DXOS.org
//

// The support service client: one URL and two fetches. Split out of `SupportOperation` because
// the app entry and the crash dialog both need it at startup, and reaching it through the module
// that defines operations pulled @dxos/compute and @dxos/echo into the eager boot graph.

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Config, EdgeServiceName, getEdgeServiceEndpoint, getEnvString } from '@dxos/config';
import type * as Observability from '@dxos/observability/Observability';

import { SupportForbiddenError, SupportSubmitError } from '../errors';
import type * as SupportOperation from './SupportOperation';

export const SupportReportResult = Schema.Struct({
  ticketId: Schema.optional(Schema.String),
  threadUrl: Schema.optional(Schema.String),
});

export type SupportReportResult = Schema.Schema.Type<typeof SupportReportResult>;

export const SupportIssueResult = Schema.Struct({
  reportId: Schema.String,
  issueId: Schema.String,
  issueIdentifier: Schema.String,
  issueUrl: Schema.String,
});

export type SupportIssueResult = Schema.Schema.Type<typeof SupportIssueResult>;

/** Config only, so it stays plain: the caller needs it before it has anything to run. */
export const supportEndpoint = (config: Config): string | undefined =>
  getEnvString(config, 'DX_DISCORD_SERVICE_URL') ?? getEdgeServiceEndpoint(config, EdgeServiceName.Discord);

/** What every report sends, whichever route files it. */
const reportBody = (
  report: SupportOperation.SupportRequest,
  observability: Observability.Observability,
  extra: { did?: string; screenshotUrl?: string; logKey?: string },
) => ({
  title: report.title,
  body: report.body,
  type: report.type,
  severity: report.severity,
  area: report.area,
  version: report.version,
  ...extra,
  posthog: observability.support.sessionContext(),
});

const postJson = (url: string, body: unknown): Effect.Effect<Response, SupportSubmitError> =>
  Effect.tryPromise({
    try: () =>
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    catch: (cause) => new SupportSubmitError({ cause }),
  });

/**
 * The service filed the report but answered with something this build cannot read, so there is no
 * ticket id to show or to tag the flushed logs with. Nothing is recoverable; say so legibly rather
 * than surfacing a raw schema error.
 */
const decodeBody = <A>(schema: Schema.Codec<A>, response: Response): Effect.Effect<A, SupportSubmitError> =>
  Effect.tryPromise({ try: () => response.json(), catch: (cause) => new SupportSubmitError({ cause }) }).pipe(
    Effect.flatMap((body) =>
      Effect.try({
        try: () => Schema.decodeUnknownSync(schema)(body),
        catch: (cause) =>
          new SupportSubmitError({ message: 'The support service returned an unexpected response', cause }),
      }),
    ),
  );

/** Uploads the debug-log dump, whose key travels with the report. */
const uploadLogs = (
  observability: Observability.Observability,
  includeLogs: boolean,
): Effect.Effect<string | undefined, SupportSubmitError> =>
  includeLogs
    ? Effect.tryPromise({
        try: () => observability.support.uploadLogs(),
        catch: (cause) => new SupportSubmitError({ message: 'Failed to upload the debug logs', cause }),
      })
    : Effect.succeed(undefined);

/**
 * Ships the dump to PostHog Logs tagged with the id the service minted. Detached: the report is
 * already filed by this point, and the dump can be large.
 */
const flushLogs = (observability: Observability.Observability, attributes: Record<string, string>) =>
  Effect.tryPromise({ try: () => observability.support.flushLogs(attributes as never), catch: (cause) => cause }).pipe(
    Effect.catchCause((cause) => Effect.logWarning('support logs flush failed', { cause })),
    Effect.forkDetach,
  );

export type SubmitSupportReportOptions = {
  endpoint: string;
  observability: Observability.Observability;
  report: SupportOperation.SupportRequest;
  did?: string;
  screenshotUrl?: string;
};

/**
 * Files the report as a support ticket with a public Discord thread: upload the dump, ask the
 * service to file everything, then flush the same dump tagged with the ticket.
 */
export const submitSupportReport = ({
  endpoint,
  observability,
  report,
  did,
  screenshotUrl,
}: SubmitSupportReportOptions): Effect.Effect<SupportReportResult, SupportSubmitError> =>
  Effect.gen(function* () {
    const includeLogs = report.includeLogs !== false;
    const logKey = yield* uploadLogs(observability, includeLogs);
    const response = yield* postJson(
      `${endpoint}/feedback`,
      reportBody(report, observability, { did, screenshotUrl, logKey }),
    );
    if (!response.ok) {
      return yield* Effect.fail(new SupportSubmitError({ context: { status: response.status } }));
    }

    const result = yield* decodeBody(SupportReportResult, response);
    if (includeLogs && result.ticketId) {
      yield* flushLogs(observability, { ticketId: result.ticketId });
    }
    return result;
  });

export type SubmitSupportIssueOptions = {
  endpoint: string;
  observability: Observability.Observability;
  report: SupportOperation.SupportRequest;
  did: string;
  screenshotUrl?: string;
};

/**
 * The team's path: files a Linear issue directly, no ticket and no public thread. The service
 * refuses any identity the hub does not know as an internal account.
 */
export const submitSupportIssue = ({
  endpoint,
  observability,
  report,
  did,
  screenshotUrl,
}: SubmitSupportIssueOptions): Effect.Effect<SupportIssueResult, SupportSubmitError | SupportForbiddenError> =>
  Effect.gen(function* () {
    const includeLogs = report.includeLogs !== false;
    const logKey = yield* uploadLogs(observability, includeLogs);
    const response = yield* postJson(
      `${endpoint}/issue`,
      reportBody(report, observability, { did, screenshotUrl, logKey }),
    );
    if (response.status === 403) {
      return yield* Effect.fail(new SupportForbiddenError());
    }
    if (!response.ok) {
      return yield* Effect.fail(new SupportSubmitError({ context: { status: response.status } }));
    }

    const result = yield* decodeBody(SupportIssueResult, response);
    if (includeLogs) {
      yield* flushLogs(observability, { reportId: result.reportId });
    }
    return result;
  });
