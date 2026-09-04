//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { type Config, EdgeServiceName, getEdgeServiceEndpoint, getEnvString } from '@dxos/config';
import { Annotation, Database, DXN, Format, Ref, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import type * as Observability from '@dxos/observability/Observability';

import * as Support from './Support';

// Schema annotations consumed by `react-ui-form`. Strings duplicated in translations.ts
// — kept inline here to avoid an import cycle (translations -> #types -> SupportOperation).
export const IssueType = Schema.Literals(['bug', 'feature']).annotate({
  title: 'Type',
  description: 'Whether this is a bug report or a feature request.',
});
export type IssueType = Schema.Schema.Type<typeof IssueType>;

export const Severity = Schema.Literals(['High priority', 'Medium priority', 'Low priority']).annotate({
  title: 'Severity',
  description: 'How disruptive the issue is.',
});
export type Severity = Schema.Schema.Type<typeof Severity>;

/**
 * Form payload for the FeedbackPanel submit action. `version` is a hidden form field populated by
 * the panel from runtime config and forwarded to the backend for triage. `area`, `type`, and
 * `severity` are optional triage metadata — they ride on the private support ticket, not the public
 * Discord post, so the form defaults them to unset rather than guessing.
 */
export const SupportRequest = Schema.Struct({
  title: Schema.String.pipe(
    Schema.check(Schema.isNonEmpty()),
    Schema.check(Schema.isMaxLength(256)),
    Schema.annotate({
      title: 'Title',
      description: 'Short summary of the issue.',
    }),
  ),
  body: Format.Text.pipe(
    Schema.check(Schema.isNonEmpty()),
    Schema.check(Schema.isMaxLength(16_384)),
    Schema.annotate({
      title: 'Description',
      description: 'Please describe the issue or feature request in detail.',
    }),
  ),
  area: Schema.String.annotate({
    title: 'Area',
    description: 'The plugin or area this relates to.',
  }).pipe(Schema.optional),
  type: IssueType.pipe(Schema.optional),
  severity: Severity.pipe(Schema.optional),
  image: Schema.Boolean.pipe(
    Schema.annotate({
      title: 'Attach screenshot',
      description:
        'Capture the current view and attach it to the report. Sent to our team only — never posted publicly.',
    }),
    Schema.optional,
  ),
  includeLogs: Schema.Boolean.pipe(
    Schema.annotate({
      title: 'Include debug logs',
      description: 'Attach the debug log bundle to the report. Sent to our team only — never posted publicly.',
    }),
    Schema.optional,
  ),
  // Hidden — auto-populated by FeedbackPanel; never rendered as an input.
  version: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
});

export type SupportRequest = Schema.Schema.Type<typeof SupportRequest>;

/** What filing a report produced: the PostHog ticket, and the public thread when one opened. */
export const SupportReportResult = Schema.Struct({
  ticketId: Schema.String,
  threadUrl: Schema.optional(Schema.String),
});

export type SupportReportResult = Schema.Schema.Type<typeof SupportReportResult>;

/**
 * Files a user report through the support service, which creates the PostHog ticket, notes where
 * the logs went, and opens the public Discord thread. Distinct from {@link CreateTicket}, which
 * creates an ECHO `Support.Ticket` in a space.
 */
export const SubmitReport = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.submitReport'),
    name: 'Submit Support Report',
    description: 'Files a user report as a PostHog support ticket with a public Discord help thread.',
    icon: 'ph--lifebuoy--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    report: SupportRequest,
    /** The reporter's identity, for the team's account lookup; absent when there is none yet. */
    did: Schema.optional(Schema.String),
    /** Public URL of the captured screenshot, when the reporter attached one. */
    screenshotUrl: Schema.optional(Schema.String),
  }),
  output: SupportReportResult,
});

/** What filing a team issue produced: the Linear issue, and the id the flushed logs are tagged with. */
export const SupportIssueResult = Schema.Struct({
  reportId: Schema.String,
  issueId: Schema.String,
  issueIdentifier: Schema.String,
  issueUrl: Schema.String,
});

export type SupportIssueResult = Schema.Schema.Type<typeof SupportIssueResult>;

/**
 * The team's own path: files the report straight to Linear through the support service, with the
 * logs and session attached, and no support ticket or public thread. The service refuses any
 * identity the hub does not know as an internal account.
 */
export const SubmitIssue = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.submitIssue'),
    name: 'File Linear Issue',
    description: 'Files a report as a Linear issue with logs attached. Internal accounts only.',
    icon: 'ph--bug--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    report: SupportRequest,
    /** Public URL of the captured screenshot, when one was attached. */
    screenshotUrl: Schema.optional(Schema.String),
  }),
  output: SupportIssueResult,
});

/** The support service, reached through EDGE unless an explicit endpoint is configured. */
export const supportEndpoint = (config: Config): string | undefined =>
  getEnvString(config, 'DX_DISCORD_SERVICE_URL') ?? getEdgeServiceEndpoint(config, EdgeServiceName.Discord);

export type SubmitSupportReportOptions = {
  endpoint: string;
  observability: Observability.Observability;
  report: SupportRequest;
  did?: string;
  screenshotUrl?: string;
};

/**
 * The submit, in order: upload the log dump (its key travels with the report), ask the support
 * service to file everything, then ship the same dump to PostHog Logs tagged with the ticket. The
 * last step is detached: the ticket and thread exist by then, and the dump can be large.
 */
export const submitSupportReport = async ({
  endpoint,
  observability,
  report,
  did,
  screenshotUrl,
}: SubmitSupportReportOptions): Promise<SupportReportResult> => {
  const logKey = report.includeLogs !== false ? await observability.support.uploadLogs() : undefined;
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
  const result = Schema.decodeUnknownSync(SupportReportResult)(await response.json());
  if (logKey) {
    void observability.support
      .flushLogs({ ticketId: result.ticketId })
      .catch((err) => log.warn('support logs flush failed', { err }));
  }
  return result;
};

export type SubmitSupportIssueOptions = {
  endpoint: string;
  observability: Observability.Observability;
  report: SupportRequest;
  did: string;
  screenshotUrl?: string;
};

/**
 * Same order as {@link submitSupportReport}, against the service's `/issue` route: upload the
 * dump, file the issue, then flush the dump to PostHog Logs tagged with the report id the
 * service minted. A 403 means the identity is not an internal account.
 */
export const submitSupportIssue = async ({
  endpoint,
  observability,
  report,
  did,
  screenshotUrl,
}: SubmitSupportIssueOptions): Promise<SupportIssueResult> => {
  const logKey = report.includeLogs !== false ? await observability.support.uploadLogs() : undefined;
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
    // The service answers `{ error }` naming which step failed; say so rather than just the status.
    const detail = await response
      .text()
      .then((text) => text.slice(0, 200))
      .catch(() => '');
    throw new Error(`support service returned ${response.status}${detail ? `: ${detail}` : ''}`);
  }
  const result = Schema.decodeUnknownSync(SupportIssueResult)(await response.json());
  if (logKey) {
    void observability.support
      .flushLogs({ reportId: result.reportId })
      .catch((err) => log.warn('support logs flush failed', { err }));
  }
  return result;
};

export const CreateTicket = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.createTicket'),
    name: 'Create Support Ticket',
    description: 'Creates a new support ticket in the active space.',
    icon: 'ph--note--regular',
  },
  input: Schema.Struct({
    title: Schema.String.annotate({
      description: 'Short summary of the issue.',
    }),
    body: Schema.optional(
      Schema.String.annotate({
        description: 'Optional longer description of the issue.',
      }),
    ),
  }),
  output: Type.getSchema(Support.Ticket),
  services: [Database.Service],
});

export const MarkInProgress = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.markInProgress'),
    name: 'Mark Support Ticket In Progress',
    description: 'Marks a support ticket as in progress.',
    icon: 'ph--clock--regular',
  },
  input: Schema.Struct({
    ticket: Ref.Ref(Support.Ticket).annotate({
      description: 'The ticket to mark as in progress.',
    }),
  }),
  output: Type.getSchema(Support.Ticket),
  services: [Database.Service],
});

export const ResolveTicket = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.resolveTicket'),
    name: 'Resolve Support Ticket',
    description: 'Marks a support ticket as resolved with optional resolution notes.',
    icon: 'ph--check--regular',
  },
  input: Schema.Struct({
    ticket: Ref.Ref(Support.Ticket).annotate({
      description: 'The ticket to resolve.',
    }),
    resolution: Schema.optional(
      Schema.String.annotate({
        description: 'Optional notes describing how the issue was resolved.',
      }),
    ),
  }),
  output: Type.getSchema(Support.Ticket),
  services: [Database.Service],
});

export const SearchDocs = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.support.searchDocs'),
    name: 'Search Documentation',
    description: 'Searches DXOS / Composer documentation for the given query.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    query: Schema.String.annotate({
      description: 'Search query.',
    }),
    limit: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThan(0))).annotate({
        description: 'Maximum number of results to return.',
      }),
    ),
  }),
  output: Schema.Struct({
    results: Schema.Array(
      Schema.Struct({
        title: Schema.String,
        url: Schema.String,
        excerpt: Schema.String,
      }),
    ),
  }),
});
