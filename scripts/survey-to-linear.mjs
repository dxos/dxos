#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Open one Linear issue per Composer feedback-panel survey response.
//
// The feedback panel submits through PostHog as a `survey sent` event whose response body is the
// Markdown blob built by `formatRequestMessage` (packages/plugins/plugin-support/src/containers/
// FeedbackPanel/request.ts) — a `# title` heading, the description, then a `**Key:** value` trailer.
// This script reads those events back out of PostHog, unpacks the trailer into Linear fields, and
// creates the issue.
//
// Idempotent by construction: every issue body ends with a `survey-response: <event uuid>` footer,
// and each response is matched against Linear (`description contains`) before it is created. Re-runs
// over an overlapping window therefore create nothing new — there is no local state file to keep in
// sync, and a deleted issue is deliberately recreated.
//
// Credentials are read from the untracked `.env` files, never from argv (an argument is visible in
// `ps` and lands in shell history):
//   <root>/.env                          LINEAR_API_KEY, POSTHOG_PERSONAL_API_KEY (or POSTHOG_API_KEY)
//   packages/apps/composer-app/.env      DX_POSTHOG_PROJECT_ID, DX_POSTHOG_FEEDBACK_SURVEY_ID
// A value already exported in the environment wins over both files.
//
// Each issue links its PostHog response and survey, and — when the submitter included debug logs —
// carries a ready-to-run `curl` for the R2 dump. Set `FEEDBACK_LOGS_1P_URL` to the 1Password item
// holding the read-only R2 token and that URL is embedded in the command instead of a TODO.
//
// PostHog's project token (`phc_…`) is write-only and cannot read responses back; reading needs a
// personal API key (`phx_…`) with the `query:read` scope — https://posthog.com/docs/api#authentication.
//
// Usage:
//   node scripts/survey-to-linear.mjs [--since <days>] [--limit <n>] [--apply]
//                                     [--survey-id <uuid>] [--team <key|name>] [--label <name>]...
//                                     [--from-file <path>] [--fire-routine [--routine-id <trig_…>]]
//                                     [--json] [--verbose]
//
// `--from-file` replays captured `survey sent` events (a JSON array or NDJSON of PostHog rows)
// instead of querying PostHog — for backfilling from an export, and for exercising the Linear half
// without a read key.
//
// `--fire-routine` starts a Claude Code routine run for each issue the sweep CREATES (never for one
// it skipped as already filed, and never in a dry run), handing it the issue key, the triage fields
// and the R2 log location. Needs `FEEDBACK_FIXER_CLAUDE_ROUTINE_KEY` (or `CLAUDE_ROUTINE_TOKEN`) plus
// `CLAUDE_ROUTINE_ID` / `--routine-id`; the id is the routine's `trig_…` value. One run per issue —
// the endpoint has no idempotency key, so a retried sweep must not re-fire, which is why only
// freshly created issues qualify.
//
// Dry run is the DEFAULT — nothing is created without `--apply`, so the normal way to inspect a
// window is to run it bare.
//
// Examples:
//   node scripts/survey-to-linear.mjs                      # last 7 days, dry run
//   node scripts/survey-to-linear.mjs --since 30 --json     # a month, machine-readable
//   node scripts/survey-to-linear.mjs --apply               # actually open the issues
//   node scripts/survey-to-linear.mjs --apply --fire-routine # …and hand each one to a routine

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

// Composer's PostHog project is EU Cloud. `DX_POSTHOG_API_HOST` is the app's ingestion proxy
// (o.composer.space) and does NOT serve the authenticated read API, so the region host is separate.
const DEFAULT_POSTHOG_HOST = 'https://eu.posthog.com';

/** Claude Code routine fire endpoint — the `claude_code` namespace, NOT the claude.ai trigger API. */
const ROUTINE_FIRE_URL = (routineId) => `https://api.anthropic.com/v1/claude_code/routines/${routineId}/fire`;

/** Required beta for the (experimental) fire endpoint; breaking changes ship behind new dated values. */
const ROUTINE_FIRE_BETA = 'experimental-cc-routine-2026-04-01';

/** The endpoint's cap on the freeform `text` payload. */
const ROUTINE_TEXT_MAX = 65_536;

// Same account the deploy pipeline and `edge-compute/scripts/upload-modules.mjs` target; not a secret.
const CLOUDFLARE_ACCOUNT_ID = '950816f3f59b079880a1ae33fb0ec320';

/**
 * Which R2 bucket holds a response's debug logs, keyed by the `environment` super-property PostHog
 * registers on every event. Mirrors the `r2_buckets` bindings in composer-app/wrangler.jsonc — note
 * `preview` and `dev` deliberately share one bucket, and `staging` binds the `-preview`-named one.
 */
const LOG_BUCKET_BY_ENVIRONMENT = {
  production: 'composer-feedback-logs',
  staging: 'composer-feedback-logs-preview',
  preview: 'composer-feedback-logs-dev',
  dev: 'composer-feedback-logs-dev',
};

/** Fallback bucket for a response whose `environment` is absent or unrecognized (e.g. a local build). */
const DEFAULT_LOG_BUCKET = 'composer-feedback-logs-dev';

/**
 * 1Password item holding the read-only R2 credentials. The item carries both the Cloudflare account
 * token and the S3-compatible pair the SigV4 signature actually needs; override with
 * `FEEDBACK_LOGS_1P_URL` if it is ever renamed or moved.
 */
const R2_CREDENTIAL_ITEM = 'op://Shared/Composer survey logs R2 read-only token';

/** Linear priority (0 none, 1 urgent, 2 high, 3 normal, 4 low) per the form's `Severity` literal. */
const PRIORITY_BY_SEVERITY = {
  'High priority': 2,
  'Medium priority': 3,
  'Low priority': 4,
};

/** Work-item-type label per the form's `IssueType` literal. */
const LABEL_BY_TYPE = {
  bug: 'Bug',
  feature: 'Improvement',
};

/** Applied to every issue: marks the feedback panel as the origin. */
const DEFAULT_LABELS = ['Composer Feedback Form'];

const usage = () => {
  console.error(
    [
      'usage: survey-to-linear.mjs [--since <days>] [--limit <n>] [--apply] [--survey-id <uuid>]',
      '                           [--team <key|name>] [--label <name>]... [--from-file <path>]',
      '                           [--fire-routine [--routine-id <trig_…>]] [--json] [--verbose]',
      '',
      'Dry run unless --apply is passed. See the header comment for credentials.',
    ].join('\n'),
  );
};

//
// Args
//

const parseArgs = (argv) => {
  const options = {
    since: 7,
    limit: 100,
    apply: false,
    surveyId: undefined,
    team: undefined,
    labels: [],
    fromFile: undefined,
    fireRoutine: false,
    routineId: undefined,
    json: false,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--apply':
        options.apply = true;
        break;
      case '--dry-run':
        options.apply = false;
        break;
      case '--json':
        options.json = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--since':
        options.since = Number(argv[++i]);
        break;
      case '--limit':
        options.limit = Number(argv[++i]);
        break;
      case '--survey-id':
        options.surveyId = argv[++i];
        break;
      case '--team':
        options.team = argv[++i];
        break;
      case '--label':
        options.labels.push(argv[++i]);
        break;
      case '--from-file':
        options.fromFile = argv[++i];
        break;
      case '--fire-routine':
        options.fireRoutine = true;
        break;
      case '--routine-id':
        options.routineId = argv[++i];
        break;
      case '--help':
      case '-h':
        usage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        usage();
        process.exit(1);
    }
  }

  if (!Number.isFinite(options.since) || options.since <= 0) {
    console.error('--since must be a positive number of days');
    process.exit(1);
  }
  if (!Number.isInteger(options.limit) || options.limit <= 0) {
    console.error('--limit must be a positive integer');
    process.exit(1);
  }

  return options;
};

//
// Env
//

/**
 * Parse a `.env` file leniently: `export FOO=bar` and quoted values are both accepted, and any line
 * that is not an assignment is skipped — these files are hand-assembled (and sometimes carry the
 * stdout of whatever wrote them), so one stray line must not take the whole file down.
 */
const parseEnvFile = (path) => {
  const vars = {};
  if (!existsSync(path)) {
    return vars;
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    vars[key] = value;
  }
  return vars;
};

/** Process env wins, then the repo-root `.env`, then the app's. */
const loadEnv = (root) => ({
  ...parseEnvFile(join(root, 'packages/apps/composer-app/.env')),
  ...parseEnvFile(join(root, '.env')),
  ...process.env,
});

//
// PostHog
//

/** Single-quote a HogQL string literal. */
const hogqlString = (value) => `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

/**
 * Read `survey sent` events for one survey. Selects the whole `properties` map rather than named
 * response columns: the response key is `$survey_response_<question id>`, so the column name is a
 * property of the survey definition, not of the schema.
 */
const fetchSurveyResponses = async ({ host, apiKey, projectId, surveyId, since, limit }) => {
  const query = [
    'SELECT uuid, timestamp, distinct_id, properties',
    'FROM events',
    "WHERE event = 'survey sent'",
    `  AND properties.$survey_id = ${hogqlString(surveyId)}`,
    `  AND timestamp > now() - INTERVAL ${since} DAY`,
    'ORDER BY timestamp ASC',
    `LIMIT ${limit}`,
  ].join('\n');

  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`PostHog query failed (${response.status}): ${detail.slice(0, 400)}`);
  }

  const { results = [] } = await response.json();
  return results.map(([uuid, timestamp, distinctId, properties]) => ({
    uuid,
    timestamp,
    distinctId,
    properties: typeof properties === 'string' ? JSON.parse(properties) : (properties ?? {}),
  }));
};

/**
 * Read captured `survey sent` events from disk — a JSON array, a single JSON object, or NDJSON.
 * Accepts both the raw `[uuid, timestamp, distinct_id, properties]` row shape the query API returns
 * and the already-named object shape this script produces.
 */
const readCapturedResponses = (path) => {
  const text = readFileSync(path, 'utf8').trim();
  const parsed =
    text.startsWith('[') || text.startsWith('{')
      ? JSON.parse(text)
      : text
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => JSON.parse(line));
  const rows =
    Array.isArray(parsed) && !Array.isArray(parsed[0]) && typeof parsed[0] !== 'object' ? [parsed] : [].concat(parsed);

  return rows.map((row) => {
    const [uuid, timestamp, distinctId, properties] = Array.isArray(row)
      ? row
      : [row.uuid, row.timestamp, row.distinct_id ?? row.distinctId, row.properties];
    return {
      uuid,
      timestamp,
      distinctId,
      properties: typeof properties === 'string' ? JSON.parse(properties) : (properties ?? {}),
    };
  });
};

//
// Parsing
//

/**
 * Invert `formatRequestMessage`: `# title`, blank line, body, a `---` rule, then `**Key:** value`
 * lines. Every part is optional in practice — a response predating a field, or one submitted through
 * another client, still has to yield an issue rather than throw.
 */
const parseRequestMessage = (message) => {
  const lines = String(message ?? '').split('\n');
  let title;
  if (lines[0]?.startsWith('# ')) {
    title = lines.shift().slice(2).trim();
    while (lines[0] === '') {
      lines.shift();
    }
  }

  // The LAST horizontal rule opens the trailer; an earlier one belongs to the user's own prose.
  const ruleIndex = lines.lastIndexOf('---');
  const trailerLines = ruleIndex === -1 ? [] : lines.slice(ruleIndex + 1);
  const bodyLines = ruleIndex === -1 ? lines : lines.slice(0, ruleIndex);

  const fields = {};
  for (const line of trailerLines) {
    const match = /^\*\*([^*]+):\*\*\s*(.*)$/.exec(line.trim());
    if (match) {
      fields[match[1].trim().toLowerCase()] = match[2].trim();
    }
  }

  const body = bodyLines.join('\n').trim();
  return {
    title: title || body.split('\n')[0]?.slice(0, 120) || 'Feedback (no title)',
    body,
    type: fields.type,
    severity: fields.severity,
    area: fields.area,
    version: fields.version,
  };
};

/** Pull the survey answer out of the event's `$survey_response*` property, whatever the question id. */
const responseText = (properties) => {
  const key = Object.keys(properties).find((candidate) => candidate.startsWith('$survey_response'));
  const value = key ? properties[key] : undefined;
  return Array.isArray(value) ? value.join('\n') : (value ?? '');
};

/** Closing line on every issue, so a reader knows the body was not hand-written. */
const PROVENANCE =
  'This issue was automatically created based on a user report from Composer. If you are an agent: perform an appropriate action to process the submission. Consult the repository resource for more information.';

/** Dedupe needle. Visible rather than an HTML comment so it survives any Markdown normalization. */
const footer = (uuid) => `survey-response: \`${uuid}\``;

/**
 * Link to the survey the response answered. Deliberately NOT the per-event deep link: PostHog's
 * event-detail route does not resolve reliably, so it would ship a dead link in every issue. The
 * `survey-response` footer below carries the event uuid for anyone who needs to find the row.
 */
const posthogLinks = ({ response, projectId, surveyId, uiHost }) => {
  const survey = response.properties.$survey_id ?? surveyId;
  if (!projectId || !survey) {
    return [];
  }
  const url = `${uiHost}/project/${projectId}/surveys/${survey}`;
  // Explicit link rather than a bare URL: Linear's autolinker can swallow the following line.
  return [`PostHog survey: [${url}](${url})`];
};

/**
 * How to pull the debug-log dump. R2 object reads go through the S3 API, which requires SigV4 —
 * hence `--aws-sigv4` rather than a bearer token. The 1Password item holds a Cloudflare API token,
 * not an S3 key pair, so the pair is derived: access key id = the token's id, secret access key =
 * sha256 of the token value (Cloudflare's documented scheme for authenticating the R2 S3 API with
 * an API token). Both are cacheable — export them once and the `op read` line can be skipped.
 */
const logsCurlBlock = ({ logKey, bucket, credentialUrl }) =>
  [
    'Fetch the debug logs:',
    '',
    '```',
    "curl -sS --aws-sigv4 'aws:amz:auto:s3' \\",
    '  --user "$R2_ACCESS_KEY_ID:$R2_SECRET_ACCESS_KEY" \\',
    `  'https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}/${logKey}' \\`,
    '  -o feedback-logs.ndjson',
    '```',
  ].join('\n');

const issueDescription = (response, { parsed, projectId, surveyId, uiHost, credentialUrl }) => {
  const logKey = response.properties.debug_log_dump_key;
  const environment = response.properties.environment;
  const bucket = LOG_BUCKET_BY_ENVIRONMENT[environment] ?? DEFAULT_LOG_BUCKET;
  const hasLogs = Boolean(logKey) && logKey !== 'failed';

  const metadata = [
    parsed.type && `Type: ${parsed.type}`,
    parsed.severity && `Severity: ${parsed.severity}`,
    // Backticked: an area like `dxos.org/plugin/markdown` is otherwise autolinked by Linear.
    parsed.area && `Area: \`${parsed.area}\``,
    parsed.version && `Version: ${parsed.version}`,
    environment && `Environment: ${environment}`,
    `Submitted: ${response.timestamp}`,
    response.distinctId && `PostHog person: \`${response.distinctId}\``,
    ...posthogLinks({ response, projectId, surveyId, uiHost }),
    hasLogs && `Debug logs: \`${bucket}/${logKey}\``,
    logKey === 'failed' && 'Debug logs: upload failed',
    !logKey && 'Debug logs: not included',
  ].filter(Boolean);

  return [
    parsed.body,
    metadata.join('\n'),
    footer(response.uuid),
    PROVENANCE,
    hasLogs && logsCurlBlock({ logKey, bucket, credentialUrl }),
  ]
    .filter(Boolean)
    .join('\n\n');
};

//
// Claude Code routine
//

/**
 * Start a run of an existing routine. The token is per-routine and grants no read access, so there
 * is nothing to look up first — a POST is the whole protocol. Each call creates a new session and
 * there is no idempotency key, hence one fire per issue actually created, never per response seen.
 */
const fireRoutine = async ({ token, routineId, text }) => {
  const response = await fetch(ROUTINE_FIRE_URL(routineId), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': ROUTINE_FIRE_BETA,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: text.slice(0, ROUTINE_TEXT_MAX) }),
  });

  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(`Routine fire failed (${response.status}): ${payload?.error?.message ?? 'no detail'}`);
  }
  return { sessionId: payload?.claude_code_session_id, sessionUrl: payload?.claude_code_session_url };
};

/**
 * Context handed to the run. The routine's own saved prompt does the work; this only has to say
 * which issue to work in and where the evidence is, so the run does not have to rediscover either.
 */
const routineText = ({ issue, parsed, response, bucket, logKey }) => {
  const hasLogs = Boolean(logKey) && logKey !== 'failed';
  const header = [
    `Linear issue ${issue.identifier} (${issue.url}) was just filed from a Composer feedback-panel survey response.`,
    `Title: ${parsed.title}`,
    parsed.type && `Type: ${parsed.type}`,
    parsed.severity && `Severity: ${parsed.severity}`,
    parsed.area && `Area: ${parsed.area}`,
    parsed.version && `Version: ${parsed.version}`,
    response.properties.environment && `Environment: ${response.properties.environment}`,
    hasLogs
      ? `Debug logs: R2 object ${bucket}/${logKey} — the issue body carries the curl that fetches it.`
      : 'Debug logs: none attached (the submitter opted out, or the upload failed).',
    `PostHog survey response uuid: ${response.uuid}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Kept as its own paragraph: the run should not mistake the reporter's prose for another metadata line.
  return `${header}\n\nReported by the user:\n${parsed.body}`;
};

//
// Linear
//

const linearRequest = async (apiKey, query, variables) => {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => undefined);
  if (!response.ok || payload?.errors) {
    const message = payload?.errors?.map((error) => error.message).join('; ') ?? `HTTP ${response.status}`;
    throw new Error(`Linear API error: ${message}`);
  }
  return payload.data;
};

// Teams and labels are fetched separately: nesting a 250-label connection under a 50-team one
// multiplies out past Linear's complexity ceiling ("Query too complex").
const TEAMS_QUERY = `
  query Teams {
    teams(first: 50) {
      nodes { id key name }
    }
  }
`;

const TEAM_LABELS_QUERY = `
  query TeamLabels($teamId: String!) {
    team(id: $teamId) {
      labels(first: 250) {
        nodes { id name }
      }
    }
  }
`;

const EXISTING_QUERY = `
  query Existing($teamId: ID!, $needle: String!) {
    issues(filter: { team: { id: { eq: $teamId } }, description: { contains: $needle } }, first: 1) {
      nodes { id identifier url }
    }
  }
`;

const CREATE_MUTATION = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier url }
    }
  }
`;

/** Resolve the target team (with its labels), preferring an explicit key/name; one team needs no flag. */
const resolveTeam = async (apiKey, wanted) => {
  const { teams } = await linearRequest(apiKey, TEAMS_QUERY);
  const nodes = teams.nodes;
  if (nodes.length === 0) {
    throw new Error('Linear returned no teams for this credential');
  }

  let team;
  if (wanted) {
    team = nodes.find((candidate) => candidate.key === wanted || candidate.name === wanted || candidate.id === wanted);
    if (!team) {
      throw new Error(`No Linear team matching "${wanted}". Available: ${nodes.map((t) => t.key).join(', ')}`);
    }
  } else if (nodes.length > 1) {
    throw new Error(`Workspace has ${nodes.length} teams — pass --team <${nodes.map((t) => t.key).join('|')}>`);
  } else {
    team = nodes[0];
  }

  const { team: withLabels } = await linearRequest(apiKey, TEAM_LABELS_QUERY, { teamId: team.id });
  return { ...team, labels: withLabels.labels };
};

const resolveLabelIds = (team, names, { verbose }) => {
  const ids = [];
  for (const name of names) {
    const label = team.labels.nodes.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
    if (label) {
      ids.push(label.id);
    } else if (verbose) {
      console.error(`  ! no "${name}" label on team ${team.key} — skipping it`);
    }
  }
  return ids;
};

//
// Main
//

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const env = loadEnv(root);

  const linearApiKey = env.LINEAR_API_KEY;
  // `DX_POSTHOG_API_KEY` is deliberately NOT consulted — that is the write-only `phc_…` project token.
  const posthogApiKey = env.POSTHOG_PERSONAL_API_KEY ?? env.POSTHOG_API_KEY ?? env.POSTHOG_API_KEY_READ;
  const projectId = env.DX_POSTHOG_PROJECT_ID;
  const surveyId = options.surveyId ?? env.DX_POSTHOG_FEEDBACK_SURVEY_ID;
  const posthogHost = env.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST;
  // Placeholder until the 1Password item exists; override without touching this file.
  const credentialUrl = env.FEEDBACK_LOGS_1P_URL ?? R2_CREDENTIAL_ITEM;
  // Trimmed: a stray space around the value yields `Bearer  sk-…` and a bare 401 with no hint why.
  const routineToken = (env.CLAUDE_ROUTINE_TOKEN ?? env.FEEDBACK_FIXER_CLAUDE_ROUTINE_KEY)?.trim();
  const routineId = (options.routineId ?? env.CLAUDE_ROUTINE_ID)?.trim();

  // Replaying a capture needs neither the read key nor the project/survey coordinates.
  const missing = [
    !linearApiKey && 'LINEAR_API_KEY (root .env)',
    !options.fromFile &&
      !posthogApiKey &&
      'POSTHOG_PERSONAL_API_KEY (root .env) — a `phx_…` key with the query:read scope',
    !options.fromFile && !projectId && 'DX_POSTHOG_PROJECT_ID (composer-app/.env)',
    !options.fromFile && !surveyId && 'DX_POSTHOG_FEEDBACK_SURVEY_ID (composer-app/.env) or --survey-id',
  ].filter(Boolean);
  // Checked up front rather than at the first fire: a half-done run would leave issues filed with
  // no routine started, and re-running skips them as already filed.
  if (options.fireRoutine) {
    missing.push(
      !routineToken &&
        'FEEDBACK_FIXER_CLAUDE_ROUTINE_KEY or CLAUDE_ROUTINE_TOKEN (root .env) — the per-routine `sk-ant-oat01-…` token',
      !routineId && 'CLAUDE_ROUTINE_ID (root .env) or --routine-id <trig_…>',
    );
  }
  if (missing.filter(Boolean).length > 0) {
    console.error(
      `Missing credentials/config:\n${missing
        .filter(Boolean)
        .map((entry) => `  - ${entry}`)
        .join('\n')}`,
    );
    process.exit(1);
  }

  const responses = options.fromFile
    ? readCapturedResponses(options.fromFile)
    : await fetchSurveyResponses({
        host: posthogHost,
        apiKey: posthogApiKey,
        projectId,
        surveyId,
        since: options.since,
        limit: options.limit,
      });

  if (!options.json) {
    console.error(
      options.fromFile
        ? `${responses.length} captured survey response(s) from ${options.fromFile}.`
        : `${responses.length} survey response(s) in the last ${options.since} day(s).`,
    );
  }

  const team = await resolveTeam(linearApiKey, options.team);
  const outcomes = [];

  for (const response of responses) {
    const parsed = parseRequestMessage(responseText(response.properties));
    const description = issueDescription(response, {
      parsed,
      projectId,
      surveyId,
      uiHost: posthogHost,
      credentialUrl,
    });
    const labelNames = [...new Set([...DEFAULT_LABELS, LABEL_BY_TYPE[parsed.type], ...options.labels].filter(Boolean))];

    const { issues } = await linearRequest(linearApiKey, EXISTING_QUERY, {
      teamId: team.id,
      needle: footer(response.uuid),
    });
    const existing = issues.nodes[0];
    if (existing) {
      outcomes.push({ uuid: response.uuid, action: 'skipped', reason: 'already filed', issue: existing });
      if (!options.json) {
        console.error(`= ${existing.identifier} already filed for ${response.uuid}`);
      }
      continue;
    }

    if (!options.apply) {
      outcomes.push({
        uuid: response.uuid,
        action: 'would-create',
        title: parsed.title,
        labels: labelNames,
        priority: PRIORITY_BY_SEVERITY[parsed.severity] ?? 0,
        description,
      });
      if (!options.json) {
        console.error(
          `+ would create "${parsed.title}" [${labelNames.join(', ')}]${options.fireRoutine ? ' + fire routine' : ''}`,
        );
        if (options.verbose) {
          console.error(description.replace(/^/gm, '    '));
        }
      }
      continue;
    }

    const { issueCreate } = await linearRequest(linearApiKey, CREATE_MUTATION, {
      input: {
        teamId: team.id,
        title: parsed.title,
        description,
        priority: PRIORITY_BY_SEVERITY[parsed.severity] ?? 0,
        labelIds: resolveLabelIds(team, labelNames, options),
      },
    });
    if (!issueCreate.success) {
      throw new Error(`Linear refused to create an issue for ${response.uuid}`);
    }
    const outcome = { uuid: response.uuid, action: 'created', issue: issueCreate.issue };
    outcomes.push(outcome);
    if (!options.json) {
      console.error(`+ ${issueCreate.issue.identifier} ${issueCreate.issue.url}`);
    }

    if (options.fireRoutine) {
      const logKey = response.properties.debug_log_dump_key;
      const bucket = LOG_BUCKET_BY_ENVIRONMENT[response.properties.environment] ?? DEFAULT_LOG_BUCKET;
      // A failed fire must not abort the sweep: the issue is already filed, and re-running would
      // skip it as such, so the run is reported against the outcome and the loop continues.
      try {
        const run = await fireRoutine({
          token: routineToken,
          routineId,
          text: routineText({ issue: issueCreate.issue, parsed, response, bucket, logKey }),
        });
        outcome.routineRun = run;
        if (!options.json) {
          console.error(`  ↳ routine run ${run.sessionUrl ?? run.sessionId}`);
        }
      } catch (error) {
        outcome.routineError = error.message;
        if (!options.json) {
          console.error(`  ! routine fire failed: ${error.message}`);
        }
      }
    }
  }

  if (options.json) {
    console.log(JSON.stringify({ team: team.key, dryRun: !options.apply, outcomes }, null, 2));
  } else {
    const counts = outcomes.reduce(
      (acc, outcome) => ({ ...acc, [outcome.action]: (acc[outcome.action] ?? 0) + 1 }),
      {},
    );
    console.error(
      `Done${options.apply ? '' : ' (dry run — pass --apply to create)'}: ${
        Object.entries(counts)
          .map(([action, count]) => `${count} ${action}`)
          .join(', ') || 'nothing to do'
      }`,
    );
  }
};

await main();
