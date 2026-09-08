//
// Copyright 2026 DXOS.org
//

// The support service client: one URL and two fetches. Split out of `SupportOperation` because
// the app entry and the crash dialog both need it at startup, and reaching it through the module
// that defines operations pulled @dxos/compute and @dxos/echo into the eager boot graph.

import * as Schema from 'effect/Schema';

import { type Config, EdgeServiceName, getEdgeServiceEndpoint, getEnvString } from '@dxos/config';
import { log } from '@dxos/log';
import type * as Observability from '@dxos/observability/Observability';

import * as SupportOperation from './SupportOperation';

export const SupportReportResult = Schema.Struct({
  ticketId: Schema.String,
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

/**
 * The service filed the report but answered with something this build cannot read, so there is no
 * ticket id to show or to tag the flushed logs with. Nothing is recoverable; say so legibly rather
 * than surfacing a raw schema error.
 */
const decodeResult = <T>(schema: Schema.Codec<T>, body: unknown): T => {
  try {
    return Schema.decodeUnknownSync(schema)(body);
  } catch (err) {
    log.warn('unexpected support service response', { body, err });
    throw new Error('The support service returned an unexpected response.');
  }
};

export const supportEndpoint = (config: Config): string | undefined =>
  getEnvString(config, 'DX_DISCORD_SERVICE_URL') ?? getEdgeServiceEndpoint(config, EdgeServiceName.Discord);

export type SubmitSupportReportOptions = {
  endpoint: string;
  observability: Observability.Observability;
  report: SupportOperation.SupportRequest;
  did?: string;
  screenshotUrl?: string;
};

export const submitSupportReport = async ({
  endpoint,
  observability,
  report,
  did,
  screenshotUrl,
}: SubmitSupportReportOptions): Promise<SupportReportResult> => {
  const includeLogs = report.includeLogs !== false;
  const logKey = includeLogs ? await observability.support.uploadLogs() : undefined;
  const response = await fetch(`${endpoint}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: report.title,
      body: report.body,
      type: report.type,
      severity: report.severity,
      area: report.area,
      version: report.version,
      did,
      screenshotUrl,
      logKey,
      posthog: observability.support.sessionContext(),
    }),
  });
  if (!response.ok) {
    throw new Error(`support service returned ${response.status}`);
  }
  const result = decodeResult(SupportReportResult, await response.json());
  if (includeLogs) {
    void observability.support
      .flushLogs({ ticketId: result.ticketId })
      .catch((err) => log.warn('support logs flush failed', { err }));
  }
  return result;
};

export type SubmitSupportIssueOptions = {
  endpoint: string;
  observability: Observability.Observability;
  report: SupportOperation.SupportRequest;
  did: string;
  screenshotUrl?: string;
};

export const submitSupportIssue = async ({
  endpoint,
  observability,
  report,
  did,
  screenshotUrl,
}: SubmitSupportIssueOptions): Promise<SupportIssueResult> => {
  const includeLogs = report.includeLogs !== false;
  const logKey = includeLogs ? await observability.support.uploadLogs() : undefined;
  const response = await fetch(`${endpoint}/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: report.title,
      body: report.body,
      type: report.type,
      severity: report.severity,
      area: report.area,
      version: report.version,
      did,
      screenshotUrl,
      logKey,
      posthog: observability.support.sessionContext(),
    }),
  });
  if (response.status === 403) {
    throw new Error('Filing Linear issues is limited to internal accounts.');
  }
  if (!response.ok) {
    const detail = await response
      .text()
      .then((text) => text.slice(0, 200))
      .catch(() => '');
    throw new Error(`support service returned ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const result = decodeResult(SupportIssueResult, await response.json());
  if (includeLogs) {
    void observability.support
      .flushLogs({ reportId: result.reportId })
      .catch((err) => log.warn('support logs flush failed', { err }));
  }
  return result;
};
