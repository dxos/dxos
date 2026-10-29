//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import type * as Project from '@dxos/compute/Project';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/echo/Key';
import { type ContentBlock, Message, type Task } from '@dxos/types';

import { type AgentKey, type PersonKey, type Provides as TeamProvides } from '../team/index.ts';
import { personActor } from '../util.ts';
import { type ProjectKey, type TaskKey, type TaskTimeline, initialStatus, seedFor } from './tasks.ts';
import { DAY, type Random, agentActor, at, between, iso, minutes, pick, prng, processId, toolCallId } from './util.ts';

//
// One seed per agent session. Times are offsets from the reference date; a delegated run starts when
// the run delegating to it hands off, so it carries no time of its own.
//

export type Work =
  | {
      readonly kind: 'code';
      readonly query: string;
      readonly files: ReadonlyArray<string>;
      readonly tests: string;
      readonly pr: number;
    }
  | { readonly kind: 'review'; readonly files: ReadonlyArray<string>; readonly tests: string; readonly pr: number }
  | { readonly kind: 'docs'; readonly doc: string; readonly sources: ReadonlyArray<string> }
  | { readonly kind: 'triage'; readonly sources: ReadonlyArray<string> };

export type QuestionSeed = {
  readonly to: PersonKey;
  readonly text: string;
  readonly context: string;
  readonly options: ReadonlyArray<string>;
  readonly answer: string;
  /** Minutes the person takes to answer, while the run waits. */
  readonly wait: number;
};

export type RetrySeed = {
  /** Minutes between the failed run's end and the retry. */
  readonly after: number;
  readonly minutes: number;
  readonly brief: string;
  readonly error: string;
  readonly summary: string;
};

export type RunSeed = {
  readonly key: string;
  readonly agent: AgentKey;
  readonly project: ProjectKey;
  readonly tasks: ReadonlyArray<TaskKey>;
  /** Chat name; defaults to the agent and its task. */
  readonly name?: string;
  /** `[daysAgo, hour, minute]`, or the key of the run that delegates to this one. */
  readonly start: readonly [days: number, hour: number, minute: number] | { readonly delegatedBy: string };
  readonly minutes: number;
  /** Who asked for the run. */
  readonly by: PersonKey;
  readonly brief: string;
  readonly summary: string;
  readonly work: Work;
  /** Set when the run ends in error. */
  readonly error?: string;
  readonly retry?: RetrySeed;
  /** A second request in the same session, `days` later; the first picks the task up, this one moves it on. */
  readonly followUp?: { readonly days: number; readonly minutes: number };
  readonly question?: QuestionSeed;
  /** Key of a run this one hands its review to. */
  readonly delegate?: string;
};

export const RUN_SEEDS: ReadonlyArray<RunSeed> = [
  //
  // cache
  //
  {
    key: 'contentAddressing',
    agent: 'builder',
    project: 'cache',
    tasks: ['contentAddressing'],
    start: [58, 10, 0],
    minutes: 60,
    followUp: { days: 2, minutes: 50 },
    by: 'omar',
    brief:
      'Pick up "Content-address artifacts by BLAKE3 digest". Key blobs by the BLAKE3 digest of their bytes and ' +
      'keep the v1 action key as an alias that resolves to the digest. The v2 protocol draft is in ' +
      'docs/protocol/v2.md.',
    summary:
      'Opened #371. Blobs are stored under their BLAKE3 digest and the v1 action key resolves through an alias ' +
      'table. On the staging corpus that stores 31% fewer bytes. Tests pass; Omar is the reviewer.',
    work: {
      kind: 'code',
      query: 'func (s *Store) Put',
      files: ['internal/cas/digest.go', 'internal/cas/store.go', 'internal/api/put.go'],
      tests: 'go test ./internal/cas/... ./internal/api/...',
      pr: 371,
    },
  },
  {
    key: 'clientRetry',
    agent: 'builder',
    project: 'cache',
    tasks: ['clientRetry'],
    start: [51, 16, 0],
    minutes: 25,
    followUp: { days: 1, minutes: 20 },
    by: 'felix',
    brief:
      'Do "Exponential backoff in the CLI client on 429 and 503": start at 100 ms, double to 10 s with full ' +
      'jitter, give up after six attempts and fall back to a local build.',
    summary:
      "#379 adds backoff with full jitter to the CLI's HTTP client and falls back to a local build after six " +
      'attempts. A fake-timer test covers both 429 and 503.',
    work: {
      kind: 'code',
      query: 'retry',
      files: ['cli/src/http/retry.ts', 'cli/src/http/client.ts'],
      tests: 'pnpm --filter @cairn/cli test http',
      pr: 379,
    },
  },
  {
    key: 'casIndex',
    agent: 'builder',
    project: 'cache',
    tasks: ['casIndex'],
    start: [45, 13, 0],
    minutes: 110,
    followUp: { days: 2, minutes: 100 },
    by: 'omar',
    brief:
      'Work "Move the CAS index from SQLite to the sharded KV store": 256 shards by the first digest byte, ' +
      'dual-write for a week, then a backfill. Hand the pull request to Reviewer before you mark it for review.',
    summary:
      '#388 is up and Reviewer passed it: sharded writes behind a flag, dual-write to SQLite, and a resumable ' +
      'backfill. The load test went from 4.1k to 19k writes a second. Ready for Omar.',
    work: {
      kind: 'code',
      query: 'index.Put(',
      files: ['internal/index/sharded.go', 'internal/index/sqlite.go', 'cmd/backfill/main.go'],
      tests: 'go test ./internal/index/... -run Shard',
      pr: 388,
    },
    delegate: 'reviewCasIndex',
  },
  {
    key: 'reviewCasIndex',
    agent: 'reviewer',
    project: 'cache',
    tasks: ['reviewCasIndex'],
    start: { delegatedBy: 'casIndex' },
    minutes: 35,
    by: 'omar',
    brief:
      'Review #388 for "Review the CAS index migration pull request". Run the full suite and the backfill against ' +
      'the staging snapshot, and report any key that is lost or written twice.',
    summary:
      'Approved #388. The full suite is green and the staging backfill moved 2,418,903 keys with none lost or ' +
      'duplicated. One nit inline: the shard count should come from config, not a constant.',
    work: {
      kind: 'review',
      files: ['internal/index/sharded.go', 'cmd/backfill/main.go'],
      tests: 'go test ./... && ./scripts/backfill-staging.sh --dry-run',
      pr: 388,
    },
  },
  {
    key: 'r2Backend',
    agent: 'builder',
    project: 'cache',
    tasks: ['r2Backend'],
    start: [38, 11, 0],
    minutes: 80,
    followUp: { days: 2, minutes: 70 },
    by: 'felix',
    brief:
      'Build "R2 storage backend behind the blob-store interface". Same BlobStore interface as S3, multipart ' +
      'above 64 MB, and a per-tenant switch in config.',
    summary:
      '#395 adds an R2 BlobStore with multipart uploads above 64 MB and a per-tenant backend setting. Unit tests ' +
      'run against a local R2 emulator; tests against a real bucket are a separate task.',
    work: {
      kind: 'code',
      query: 'type BlobStore interface',
      files: ['internal/blob/r2.go', 'internal/blob/multipart.go', 'internal/blob/store.go'],
      tests: 'go test ./internal/blob/...',
      pr: 395,
    },
  },
  {
    key: 'cacheKeyCollision',
    agent: 'builder',
    project: 'cache',
    tasks: ['cacheKeyCollision'],
    start: [33, 9, 30],
    minutes: 90,
    followUp: { days: 1, minutes: 70 },
    by: 'omar',
    brief:
      'Urgent: "Fix cache-key collision on concurrent writes". Two writers on one action key can interleave the ' +
      'index write and the blob write. Make the index write a compare-and-set on the digest and return 409 to the ' +
      'loser.',
    summary:
      '#402 makes the index write a compare-and-set on the digest; the losing writer gets a 409 and the client ' +
      'treats it as a hit. I reproduced the Okapi corruption under -race first, then confirmed it is gone.',
    work: {
      kind: 'code',
      query: 'func (i *ShardedIndex) Put',
      files: ['internal/index/sharded.go', 'internal/api/put.go'],
      tests: 'go test -race ./internal/index/... ./internal/api/...',
      pr: 402,
    },
  },
  {
    key: 'collisionRegressionTest',
    agent: 'builder',
    project: 'cache',
    tasks: ['collisionRegressionTest'],
    start: [32, 14, 0],
    minutes: 40,
    followUp: { days: 1, minutes: 30 },
    by: 'omar',
    brief:
      'Follow-up to #402: "Regression test for concurrent writes to one key". 64 writers, one key, 30 seconds, and ' +
      'fail on any row whose digest does not match its blob.',
    summary:
      '#404 adds TestConcurrentWritesOneKey. On main before #402 it fails with 17 bad rows in 30 seconds; with #402 ' +
      'it passes. It runs in CI under -race in 34 seconds.',
    work: {
      kind: 'code',
      query: 'TestShardedIndex',
      files: ['internal/index/collision_test.go'],
      tests: 'go test -race -run TestConcurrentWritesOneKey ./internal/index/',
      pr: 404,
    },
  },
  {
    key: 'r2Integration',
    agent: 'builder',
    project: 'cache',
    tasks: ['r2Integration'],
    start: [24, 10, 0],
    minutes: 60,
    by: 'felix',
    brief:
      'Do "Integration tests against R2": run the blob-store conformance suite against the r2-ci bucket in the ' +
      'integration workflow.',
    summary:
      'The suite fails in TestMultipartAbort: the abort returns 404 NoSuchUpload. Everything else passes. Marking ' +
      'the task failed rather than retrying blind.',
    error: 'TestMultipartAbort: expected 204 from AbortMultipartUpload, got 404 NoSuchUpload',
    retry: {
      after: 30,
      minutes: 45,
      brief: 'That test passes on my machine. Retry it with -count=3 so we know whether it is flaky.',
      error: 'TestMultipartAbort failed 2 of 3 runs: 404 NoSuchUpload',
      summary:
        'With -count=3, TestMultipartAbort failed twice out of three with the same 404, so it depends on timing. ' +
        "The backend code looks right; the bucket's lifecycle rule is the next suspect. Leaving the task failed.",
    },
    work: {
      kind: 'code',
      query: 'AbortMultipartUpload',
      files: ['internal/blob/r2_integration_test.go', '.github/workflows/integration.yml'],
      tests: 'go test -tags integration ./internal/blob/ -run R2',
      pr: 409,
    },
  },
  {
    key: 'evictionPolicy',
    agent: 'builder',
    project: 'cache',
    tasks: ['evictionPolicy'],
    start: [12, 9, 0],
    minutes: 180,
    followUp: { days: 3, minutes: 120 },
    by: 'omar',
    brief:
      'Take "Size-aware LRU eviction for the edge tier": evict by bytes, weighted by 24-hour hit count. Benchmark ' +
      'it against the September edge trace.',
    summary:
      '#418 replaces count-based eviction with a byte budget weighted by 24-hour hits. Replaying the September edge ' +
      'trace, the hit rate rose from 71% to 83% on the same disk.',
    work: {
      kind: 'code',
      query: 'func (c *EdgeCache) evict',
      files: ['internal/edge/evict.go', 'internal/edge/lru.go', 'internal/edge/stats.go'],
      tests: 'go test ./internal/edge/... -bench Evict',
      pr: 418,
    },
  },
  {
    key: 'signedUrls',
    agent: 'builder',
    project: 'cache',
    tasks: ['signedUrls'],
    start: [12, 10, 10],
    minutes: 90,
    followUp: { days: 2, minutes: 80 },
    by: 'anika',
    brief:
      'Do "Signed download URLs with a 15-minute expiry". Bind the signature to the tenant and the digest; the CLI ' +
      'follows the redirect.',
    summary:
      '#419 answers GETs for blobs over 8 MB with a 302 to a signed storage URL, bound to tenant and digest and ' +
      'valid for 15 minutes. The CLI follows it and retries once on 403. Anika should look at the key rotation.',
    work: {
      kind: 'code',
      query: 'func handleGet',
      files: ['internal/api/signed.go', 'internal/api/get.go', 'cli/src/download.ts'],
      tests: 'go test ./internal/api/... && pnpm --filter @cairn/cli test download',
      pr: 419,
    },
  },
  {
    key: 'evictionMetrics',
    agent: 'builder',
    project: 'cache',
    tasks: ['evictionMetrics'],
    start: [12, 11, 0],
    minutes: 50,
    followUp: { days: 1, minutes: 45 },
    by: 'anika',
    brief:
      'Start "Export eviction and hit-rate metrics to Prometheus": per-tenant hit rate, bytes evicted and eviction ' +
      'reason, on the edge dashboard.',
    summary:
      'Draft #420 exports the three metrics and adds panels to the edge dashboard. The eviction reason label ' +
      'depends on #418, so this waits for that to merge before the next run.',
    work: {
      kind: 'code',
      query: 'prometheus.NewCounterVec',
      files: ['internal/edge/metrics.go', 'deploy/grafana/edge.json'],
      tests: 'go test ./internal/edge/ -run Metrics',
      pr: 420,
    },
  },
  {
    key: 'migrationGuide',
    agent: 'scribe',
    project: 'cache',
    tasks: ['migrationGuide'],
    start: [18, 13, 0],
    minutes: 30,
    followUp: { days: 1, minutes: 25 },
    by: 'lucia',
    brief:
      'Write "Write the cache v1 to v2 migration guide" for customers: what changes, how to opt in, how to roll ' +
      'back. One page.',
    summary:
      'Drafted the guide in this project: what changes, opting in, rolling back, and a short FAQ. Customers who pin ' +
      'the protocol version are called out at the top.',
    work: {
      kind: 'docs',
      doc: 'Cache v1 to v2 migration guide',
      sources: ['Remote cache v2 design', 'docs/protocol/v2.md'],
    },
  },
  {
    key: 'cliWarmCache',
    agent: 'builder',
    project: 'cache',
    tasks: ['cliWarmCache'],
    start: [4, 14, 0],
    minutes: 40,
    followUp: { days: 2, minutes: 35 },
    by: 'felix',
    brief:
      'Start on "A cairn warm command that prefetches a branch\'s artifacts": find the branch\'s last green build and ' +
      'fetch its outputs in parallel.',
    summary:
      'Draft #427 adds `cairn warm <branch>` with 8 parallel downloads. There is no last-green-build endpoint yet, ' +
      'so it filters the build list client-side. Felix should decide whether that endpoint should exist first.',
    work: {
      kind: 'code',
      query: 'listBuilds(',
      files: ['cli/src/commands/warm.ts', 'cli/src/api/builds.ts'],
      tests: 'pnpm --filter @cairn/cli test warm',
      pr: 427,
    },
  },
  {
    key: 'releaseNotesDraft',
    agent: 'scribe',
    project: 'cache',
    tasks: ['releaseNotesDraft'],
    start: [3, 10, 0],
    minutes: 30,
    followUp: { days: 2, minutes: 25 },
    by: 'lucia',
    brief:
      'Draft the 1.8 release notes from the merged pull requests and the migration guide. The v2 cache goes in the ' +
      'first three lines.',
    summary:
      'Drafted "Cairn 1.8 release notes": the v2 cache and its dedup numbers first, then signed URLs, eviction, ' +
      'the CLI changes and a link to the migration guide. Eviction and signed URLs are still in review and marked.',
    work: {
      kind: 'docs',
      doc: 'Cairn 1.8 release notes',
      sources: ['Merged pull requests since 1.7', 'Cache v1 to v2 migration guide'],
    },
  },

  //
  // billing
  //
  {
    key: 'meterEvents',
    agent: 'builder',
    project: 'billing',
    tasks: ['meterEvents'],
    start: [54, 13, 0],
    minutes: 110,
    by: 'june',
    brief:
      'Do "Emit a metering event per cache hit and per GB stored": count hits in the API middleware, sample stored ' +
      'bytes hourly, and queue both locally.',
    summary:
      '#374 counts hits in the API middleware and samples stored bytes per tenant every hour, into a disk-backed ' +
      'queue. A Stripe outage now delays usage instead of losing it.',
    work: {
      kind: 'code',
      query: 'func Middleware',
      files: ['internal/meter/events.go', 'internal/meter/queue.go', 'internal/api/middleware.go'],
      tests: 'go test ./internal/meter/...',
      pr: 374,
    },
  },
  {
    key: 'meterPipeline',
    agent: 'builder',
    project: 'billing',
    tasks: ['meterPipeline'],
    start: [43, 15, 0],
    minutes: 140,
    by: 'june',
    brief:
      'Do "Batch metering events to Stripe Meters every 5 minutes": up to 500 events a batch and one idempotency ' +
      'key per batch.',
    summary:
      '#386 drains the queue every 5 minutes in batches of up to 500 with a key per batch. I replayed a day of ' +
      'staging traffic twice and Stripe recorded it once.',
    work: {
      kind: 'code',
      query: 'meter_events',
      files: ['internal/meter/stripe.go', 'internal/meter/batch.go'],
      tests: 'go test ./internal/meter/... -run Batch',
      pr: 386,
    },
  },
  {
    key: 'stripeCustomerMap',
    agent: 'builder',
    project: 'billing',
    tasks: ['stripeCustomerMap'],
    start: [37, 14, 0],
    minutes: 160,
    by: 'june',
    brief:
      'Do "Map Alien Labs tenants to Stripe customers": a customer and a usage subscription for every tenant. Ask ' +
      'June if an organization with several tenants is unclear.',
    summary:
      '#397 creates one Stripe customer per organization and one usage subscription per tenant, as June decided. A ' +
      'dry run on production data gives 212 customers and 219 subscriptions.',
    work: {
      kind: 'code',
      query: 'stripe.Customer',
      files: ['internal/billing/customers.go', 'cmd/billing-sync/main.go'],
      tests: 'go test ./internal/billing/...',
      pr: 397,
    },
    question: {
      to: 'june',
      text: 'Northpine runs two tenants, prod and ci. One Stripe customer with two subscriptions, or two customers?',
      context:
        'The mapping needs a rule for organizations with several tenants. Northpine is the only one today; Okapi ' +
        'plans a second.',
      options: ['One customer, two subscriptions', 'Two customers'],
      answer: 'One customer, two subscriptions. Finance wants one invoice per organization.',
      wait: 40,
    },
  },
  {
    key: 'webhookIdempotency',
    agent: 'builder',
    project: 'billing',
    tasks: ['webhookIdempotency'],
    start: [29, 12, 0],
    minutes: 65,
    by: 'june',
    brief:
      'Do "Idempotent handling of Stripe invoice webhooks": record event ids and make invoice.paid and ' +
      'invoice.payment_failed safe to replay.',
    summary:
      '#405 records each Stripe event id in a new stripe_events table and skips repeats. Replaying one invoice.paid ' +
      'event five times now changes the tenant once.',
    work: {
      kind: 'code',
      query: 'invoice.paid',
      files: ['internal/billing/webhooks.go', 'migrations/0042_stripe_events.sql'],
      tests: 'go test ./internal/billing/ -run Webhook',
      pr: 405,
    },
  },
  {
    key: 'shadowInvoices',
    agent: 'builder',
    project: 'billing',
    tasks: ['shadowInvoices'],
    start: [19, 9, 30],
    minutes: 120,
    by: 'june',
    brief:
      'Do "Shadow invoices for October next to the flat-rate bill". Store the usage price beside the real invoice ' +
      'and flag every tenant whose bill moves more than 25%.',
    summary:
      "#413 computes a usage-priced shadow invoice per tenant and a report. On September's numbers, 9 of 212 " +
      'tenants would move by more than 25%, 7 of them down. The list is in the pull request for June.',
    work: {
      kind: 'code',
      query: 'type Invoice struct',
      files: ['internal/billing/shadow.go', 'internal/billing/report.go'],
      tests: 'go test ./internal/billing/ -run Shadow',
      pr: 413,
    },
  },
  {
    key: 'billingFaq',
    agent: 'scribe',
    project: 'billing',
    tasks: ['billingFaq'],
    start: [15, 11, 0],
    minutes: 30,
    by: 'lucia',
    brief: 'Write the "Billing FAQ for existing customers": ten questions, two sentences each.',
    summary:
      'Wrote the FAQ: ten questions, from "Will my bill go up?" to "Can I cap my spend?". Every number comes from ' +
      'the billing migration plan.',
    work: { kind: 'docs', doc: 'Billing FAQ', sources: ['Billing migration plan', 'Shadow invoice report'] },
  },
  {
    key: 'usageDashboard',
    agent: 'builder',
    project: 'billing',
    tasks: ['usageDashboard'],
    start: [8, 15, 0],
    minutes: 90,
    by: 'tomas',
    brief:
      'Start the "Usage page in the dashboard": stored GB, hits and projected bill for this cycle, from the same ' +
      'numbers the invoice uses.',
    summary:
      'Draft #424 has the page and its API call. The projected bill needs the shadow invoice endpoint from #413, ' +
      'still in review, so for now it shows stored GB and hits.',
    work: {
      kind: 'code',
      query: 'BillingLayout',
      files: ['dashboard/src/pages/billing/Usage.tsx', 'dashboard/src/api/usage.ts'],
      tests: 'pnpm --filter @cairn/dashboard test usage',
      pr: 424,
    },
  },

  //
  // soc2
  //
  {
    key: 'accessPolicy',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['accessPolicy'],
    start: [52, 10, 0],
    minutes: 45,
    by: 'anika',
    brief: 'Draft the access control policy from how we grant access today. Flag gaps rather than inventing process.',
    summary:
      'Drafted access control in the SOC 2 policy set: roles, grant and revoke, and a quarterly review. Two gaps ' +
      'flagged: no written offboarding checklist, and two engineers with standing production admin.',
    work: {
      kind: 'docs',
      doc: 'SOC 2 policy set',
      sources: ['Cloudflare Access export', 'GitHub organization settings'],
    },
  },
  {
    key: 'incidentPolicy',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['incidentPolicy'],
    start: [48, 13, 30],
    minutes: 35,
    by: 'anika',
    brief:
      'Draft the incident response policy: severities, paging, the 24-hour customer notice and postmortems. Use the ' +
      'Okapi incident as the example.',
    summary:
      'Drafted incident response with three severity levels and the 24-hour notice rule. The Okapi incident is the ' +
      'worked example, from the timeline Omar keeps.',
    work: { kind: 'docs', doc: 'SOC 2 policy set', sources: ['On-call rotation', 'Okapi incident timeline'] },
  },
  {
    key: 'changePolicy',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['changePolicy'],
    start: [41, 9, 0],
    minutes: 28,
    by: 'anika',
    brief: 'Draft the change management policy: reviewed pull requests, CI, and the emergency path.',
    summary:
      'Drafted change management. A normal change needs one review and green CI; an emergency change may merge with ' +
      'a review within one business day, recorded in the incident.',
    work: { kind: 'docs', doc: 'SOC 2 policy set', sources: ['Branch protection rules', 'Deploy pipeline'] },
  },
  {
    key: 'complianceScanner',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['complianceScanner'],
    start: [33, 16, 0],
    minutes: 4,
    by: 'astrid',
    brief: 'One page: is a compliance automation platform worth it for us at Type I?',
    summary:
      'For ten people at Type I, a platform saves about a week of evidence collection and costs about as much as ' +
      'the audit. My recommendation is not yet.',
    work: { kind: 'docs', doc: 'Compliance tools compared', sources: ['SOC 2 policy set'] },
  },
  {
    key: 'vendorPolicy',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['vendorPolicy'],
    start: [26, 14, 0],
    minutes: 22,
    by: 'anika',
    brief: 'Draft the vendor management policy: the vendors that hold customer data, what each holds, a yearly review.',
    summary:
      'Drafted the vendor policy: four vendors touch customer data (Cloudflare, GitHub, Stripe and Google ' +
      'Workspace), each reviewed yearly. Anika should confirm the list.',
    work: { kind: 'docs', doc: 'SOC 2 policy set', sources: ['Vendors and spend'] },
  },
  {
    key: 'dataRetention',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['dataRetention'],
    start: [9, 10, 0],
    minutes: 70,
    by: 'anika',
    brief: 'Draft the data retention policy: artifacts, logs, billing records, and deleted tenants.',
    summary:
      'Drafted retention for artifacts, logs and deleted tenants: 30 days, then hard delete, per Anika. Billing ' +
      'records still need a number from June, so the task stays open.',
    work: { kind: 'docs', doc: 'SOC 2 policy set', sources: ['Storage lifecycle rules', 'Support restore requests'] },
    question: {
      to: 'anika',
      text: "How long do we keep a deleted tenant's build artifacts: 30 days or 90?",
      context:
        'The policy needs one number. Support has restored artifacts for two tenants who deleted by mistake, both ' +
        'within a week.',
      options: ['30 days', '90 days'],
      answer: '30 days, then hard delete. Say so in the deletion email.',
      wait: 25,
    },
  },
  {
    key: 'meridianQuestionnaire',
    agent: 'scribe',
    project: 'soc2',
    tasks: ['meridianQuestionnaire'],
    start: [6, 15, 30],
    minutes: 85,
    by: 'astrid',
    brief:
      "Answer Meridian's security questionnaire from the policy set. Mark any answer that rests on a policy not yet " +
      'approved.',
    summary:
      'Answered 118 of 140 questions from the policy set. The other 22 rest on the vendor policy, still in review, ' +
      'or on the penetration test. Marked the task blocked on those.',
    work: {
      kind: 'docs',
      doc: 'Meridian security questionnaire',
      sources: ['SOC 2 policy set', 'Meridian questionnaire'],
    },
  },
  {
    key: 'mfaEnforcement',
    agent: 'builder',
    project: 'soc2',
    tasks: ['mfaEnforcement'],
    start: [1, 13, 0],
    minutes: 34,
    by: 'anika',
    brief:
      'Do "Enforce MFA on the dashboard for organization owners": owners without a second factor get the setup ' +
      'screen and cannot skip it.',
    summary:
      'Stopped: enforcing MFA here locks out owners of SSO-only organizations, who cannot enroll a factor in the ' +
      'dashboard; their identity provider owns MFA. Marked failed until someone decides on an SSO exemption.',
    error: 'TestOwnerWithoutMFA: owners of SSO-only organizations cannot enroll a factor and are locked out',
    work: {
      kind: 'code',
      query: 'requireOwner(',
      files: ['dashboard/src/auth/mfa.ts', 'internal/auth/session.go'],
      tests: 'go test ./internal/auth/... && pnpm --filter @cairn/dashboard test auth',
      pr: 431,
    },
  },

  //
  // Triage sweeps, each filing what it found.
  //
  {
    key: 'triagePricing',
    agent: 'triage',
    project: 'billing',
    tasks: ['priceModel'],
    name: 'Triage: Stripe pricing follow-up',
    start: [58, 8, 10],
    minutes: 6,
    by: 'astrid',
    brief: 'Sweep the inbox and the issue tracker for anything billing-related since last week and file tasks.',
    summary: 'Filed "Decide the per-GB and per-hit prices" for June, from the Stripe thread and issue #362.',
    work: { kind: 'triage', sources: ['Stripe usage-based billing thread', 'Issue #362: usage pricing?'] },
  },
  {
    key: 'triageAuditor',
    agent: 'triage',
    project: 'soc2',
    tasks: ['auditorSelection'],
    name: 'Triage: auditor quotes',
    start: [52, 8, 5],
    minutes: 4,
    by: 'astrid',
    brief: 'File whatever the auditor emails need from us.',
    summary: 'Filed "Pick an auditor for the Type I report" for Astrid, with the three quotes from the inbox.',
    work: { kind: 'triage', sources: ['Three auditor quotes in the inbox'] },
  },
  {
    key: 'triageOrphans',
    agent: 'triage',
    project: 'cache',
    tasks: ['gcOrphans'],
    name: 'Triage: storage alerts',
    start: [47, 8, 20],
    minutes: 3,
    by: 'anika',
    brief: "Sweep last night's storage alerts and open issues and file anything real.",
    summary: 'Filed "Garbage-collect blobs orphaned by failed uploads" in the backlog, from issue #381.',
    work: { kind: 'triage', sources: ['Issue #381: 40 GB of unreferenced blobs on staging'] },
  },
  {
    key: 'triageBillingQuestions',
    agent: 'triage',
    project: 'billing',
    tasks: ['taxReview', 'customerComms'],
    name: 'Triage: customer billing questions',
    start: [40, 8, 0],
    minutes: 7,
    by: 'astrid',
    brief: 'Sweep the inbox for customer questions about the billing change and file tasks for them.',
    summary:
      'Filed two tasks: VAT handling for EU tenants for June, after two customers asked about reverse charge, and ' +
      'the 30-day customer notice for Lucía, in the backlog.',
    work: { kind: 'triage', sources: ['Two customer emails about VAT', 'Issue #391: notice period'] },
  },
  {
    key: 'triagePentest',
    agent: 'triage',
    project: 'soc2',
    tasks: ['pentest'],
    name: 'Triage: penetration test reply',
    start: [34, 8, 15],
    minutes: 2,
    by: 'anika',
    brief: 'The pentest firm replied overnight. File it.',
    summary: 'Filed "Schedule the external penetration test" for Anika with the firm\'s availability.',
    work: { kind: 'triage', sources: ['Penetration test firm availability'] },
  },
  {
    key: 'triageR2Rollout',
    agent: 'triage',
    project: 'cache',
    tasks: ['r2Rollout'],
    name: 'Triage: R2 rollout',
    start: [27, 8, 10],
    minutes: 5,
    by: 'felix',
    brief: "Sweep this week's issues tagged storage and file the follow-ups.",
    summary: 'Filed "Switch beta tenants to the R2 backend" for Builder, after the integration tests.',
    work: { kind: 'triage', sources: ['Issue #398: move beta tenants to R2'] },
  },
  {
    key: 'triageDashboardPlugin',
    agent: 'triage',
    project: 'cache',
    tasks: ['dashboardPlugin'],
    name: 'Triage: dashboard plugin',
    start: [22, 8, 5],
    minutes: 4,
    by: 'astrid',
    brief: 'Sweep the inbox and issues for anything about the dashboard and file the follow-ups.',
    summary: 'Filed "Ship the Cairn dashboard as a Composer plugin" for Builder, from issue #407.',
    work: { kind: 'triage', sources: ['Issue #407: ship the dashboard as a Composer plugin'] },
  },
  {
    key: 'triageBillingUi',
    agent: 'triage',
    project: 'billing',
    tasks: ['dunning', 'pricingPage'],
    name: 'Triage: billing UI follow-ups',
    start: [16, 8, 20],
    minutes: 6,
    by: 'june',
    brief: 'Sweep the billing issues opened since the shadow invoices and file what is missing.',
    summary: 'Filed dunning emails for Builder and the pricing page update for Tomás.',
    work: { kind: 'triage', sources: ['Issue #414: failed usage invoices', 'Issue #415: pricing page'] },
  },
  {
    key: 'triageAudit',
    agent: 'triage',
    project: 'soc2',
    tasks: ['policyIndex', 'evidenceCollection'],
    name: 'Triage: auditor checklist',
    start: [11, 8, 0],
    minutes: 5,
    by: 'anika',
    brief: 'The auditor sent their checklist. File a task per item we have not covered.',
    summary:
      'Filed two tasks from the checklist: compile the policy set for Scribe, and evidence collection for Anika.',
    work: { kind: 'triage', sources: ['Auditor checklist'] },
  },
  {
    key: 'triageBeta',
    agent: 'triage',
    project: 'cache',
    tasks: ['betaInvites'],
    name: 'Triage: beta requests',
    start: [6, 8, 10],
    minutes: 3,
    by: 'lucia',
    brief: 'Customers have been asking about the v2 beta. File it.',
    summary: 'Filed "Invite three design partners to the cache v2 beta" for Lucía.',
    work: { kind: 'triage', sources: ['Two customer emails asking about the v2 beta'] },
  },
  {
    key: 'triageRelease',
    agent: 'triage',
    project: 'cache',
    tasks: ['release18'],
    name: 'Triage: 1.8 release',
    start: [2, 8, 0],
    minutes: 4,
    by: 'omar',
    brief: 'File the 1.8 release task, depending on everything that has to land first.',
    summary: 'Filed "Cut the Cairn 1.8 release" for Builder, depending on eviction, signed URLs and the release notes.',
    work: { kind: 'triage', sources: ['Milestone 1.8 shipped'] },
  },
];

//
// The plan: every run on the reference clock, computed first so each task's log records the same moves.
//

type ToolKey =
  | 'askQuestion'
  | 'delegateTask'
  | 'editFile'
  | 'labelIssue'
  | 'openPullRequest'
  | 'queryDatabase'
  | 'readDocument'
  | 'readFile'
  | 'readPullRequest'
  | 'reviewPullRequest'
  | 'runTests'
  | 'searchCode'
  | 'searchIssues'
  | 'searchMailbox'
  | 'updateTasks'
  | 'writeDocument';

/** The tool name the model calls, and the operation behind it. */
export const TOOLS: Record<
  ToolKey,
  { readonly name: string; readonly key: string; readonly label: string; readonly icon: string }
> = {
  askQuestion: {
    name: 'ask_question',
    key: 'org.dxos.operation.assistantToolkit.askQuestion',
    label: 'Ask question',
    icon: 'ph--question--regular',
  },
  delegateTask: {
    name: 'delegate_task',
    key: 'org.dxos.operation.assistantToolkit.delegateTask',
    label: 'Delegate task',
    icon: 'ph--arrow-bend-down-right--regular',
  },
  editFile: {
    name: 'edit_file',
    key: 'org.dxos.operation.github.editFile',
    label: 'Edit file',
    icon: 'ph--pencil-simple--regular',
  },
  labelIssue: {
    name: 'label_issue',
    key: 'org.dxos.operation.github.labelIssue',
    label: 'Label issue',
    icon: 'ph--tag--regular',
  },
  openPullRequest: {
    name: 'open_pull_request',
    key: 'org.dxos.operation.github.openPullRequest',
    label: 'Open pull request',
    icon: 'ph--git-pull-request--regular',
  },
  queryDatabase: {
    name: 'query_database',
    key: 'org.dxos.operation.database.query',
    label: 'Query space',
    icon: 'ph--database--regular',
  },
  readDocument: {
    name: 'read_document',
    key: 'org.dxos.operation.markdown.read',
    label: 'Read document',
    icon: 'ph--file-text--regular',
  },
  readFile: {
    name: 'read_file',
    key: 'org.dxos.operation.github.readFile',
    label: 'Read file',
    icon: 'ph--file-code--regular',
  },
  readPullRequest: {
    name: 'read_pull_request',
    key: 'org.dxos.operation.github.readPullRequest',
    label: 'Read pull request',
    icon: 'ph--git-diff--regular',
  },
  reviewPullRequest: {
    name: 'review_pull_request',
    key: 'org.dxos.operation.github.reviewPullRequest',
    label: 'Review pull request',
    icon: 'ph--chat-centered-text--regular',
  },
  runTests: {
    name: 'run_tests',
    key: 'org.dxos.operation.sandbox.runTests',
    label: 'Run tests',
    icon: 'ph--flask--regular',
  },
  searchCode: {
    name: 'search_code',
    key: 'org.dxos.operation.github.searchCode',
    label: 'Search code',
    icon: 'ph--magnifying-glass--regular',
  },
  searchIssues: {
    name: 'search_issues',
    key: 'org.dxos.operation.github.searchIssues',
    label: 'Search issues',
    icon: 'ph--bug--regular',
  },
  searchMailbox: {
    name: 'search_mailbox',
    key: 'org.dxos.operation.inbox.search',
    label: 'Search mailbox',
    icon: 'ph--envelope--regular',
  },
  updateTasks: {
    name: 'update_tasks',
    key: 'org.dxos.operation.assistantToolkit.updateTasks',
    label: 'Update tasks',
    icon: 'ph--check-square-offset--regular',
  },
  writeDocument: {
    name: 'write_document',
    key: 'org.dxos.operation.markdown.update',
    label: 'Write document',
    icon: 'ph--note-pencil--regular',
  },
};

export type Move = { readonly task: TaskKey; readonly from?: Task.Status; readonly to: Task.Status };

/** One tool call as the model makes it: what it says, what it calls, what comes back. */
type Step = {
  readonly tool: ToolKey;
  readonly say: string;
  readonly input: Record<string, unknown>;
  readonly result?: string;
  readonly error?: string;
  readonly moves?: ReadonlyArray<Move>;
  readonly question?: QuestionSeed & { readonly task: TaskKey };
  readonly delegate?: string;
  /** Minutes the run waits after the call: on an answer, or inside it on a delegated run. */
  readonly wait?: number;
};

export type PlannedStep = Step & {
  readonly pid: string;
  readonly toolCallId: string;
  readonly at: number;
  readonly end: number;
  /** When the run resumes after waiting on this step's answer. */
  readonly resumedAt?: number;
};

export type PlannedRequest = {
  readonly pid: string;
  readonly parentPid?: string;
  readonly begin: number;
  readonly end: number;
  readonly error?: string;
  readonly brief: { readonly at: number; readonly text: string };
  readonly summary: { readonly at: number; readonly text: string };
  readonly steps: ReadonlyArray<PlannedStep>;
};

export type PlannedRun = {
  readonly seed: RunSeed;
  readonly requests: ReadonlyArray<PlannedRequest>;
  /** The delegation this run makes, with the delegated run's pid and the pid of the request making it. */
  readonly delegation?: {
    readonly run: string;
    readonly pid: string;
    readonly parentPid: string;
    readonly spawnedAt: number;
    readonly completedAt: number;
  };
};

export type Plan = { readonly runs: ReadonlyArray<PlannedRun>; readonly timeline: TaskTimeline };

/** Most messages a chat feed may hold; a run's tool calls are capped to fit. */
const MAX_MESSAGES = 30;

/** Where a run leaves each of its tasks. */
const finalMove = (key: TaskKey): Task.Status | undefined => {
  switch (seedFor(key).status) {
    case 'review':
    case 'done':
    case 'cancelled':
      return 'review';
    case 'failed':
      return 'failed';
    case 'blocked':
      return 'blocked';
    default:
      return undefined;
  }
};

const ext = (file: string) => file.slice(file.lastIndexOf('.') + 1);

const lines = (random: Random) => between(random, 40, 420);

/** The tool calls between a run picking its tasks up and putting them down. */
const workSteps = (seed: RunSeed, random: Random, count: number, failing: string | undefined): Step[] => {
  const { work } = seed;
  const steps: Step[] = [];
  switch (work.kind) {
    case 'code': {
      const files = work.files;
      const branch = `${seed.agent}/${seed.key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
      steps.push({
        tool: 'searchCode',
        say: `Finding where \`${work.query}\` lives before changing anything.`,
        input: { query: work.query, repo: 'alien-labs/cairn' },
        result: `${between(random, 3, 18)} matches in ${between(random, 2, 6)} files\n${files
          .map((file) => `${file}:${between(random, 12, 300)}`)
          .join('\n')}`,
      });
      const pool: Step[] = [];
      for (const file of files) {
        pool.push({
          tool: 'readFile',
          say: pick(random, [`Reading ${file}.`, `Checking how ${file} is structured.`, `Opening ${file}.`]),
          input: { path: file, ref: 'main' },
          result: `${file} (${lines(random)} lines, ${ext(file)})`,
        });
      }
      for (const file of files) {
        const added = between(random, 6, 160);
        pool.push({
          tool: 'editFile',
          say: pick(random, [`Changing ${file}.`, `Writing the change in ${file}.`, `Editing ${file}.`]),
          input: { path: file, branch },
          result: `Applied ${between(random, 1, 6)} hunks to ${file} (+${added} -${between(random, 0, added)})`,
        });
      }
      const flaky = pick(random, files);
      pool.push({
        tool: 'runTests',
        say: 'Running the tests for what I changed.',
        input: { command: work.tests, branch },
        result: `FAIL ${flaky}: 1 failed, ${between(random, 20, 90)} passed`,
      });
      pool.push({
        tool: 'editFile',
        say: `Fixing the failure in ${flaky}.`,
        input: { path: flaky, branch },
        result: `Applied 1 hunk to ${flaky} (+${between(random, 2, 12)} -${between(random, 1, 6)})`,
      });
      while (pool.length < count) {
        const file = pick(random, files);
        pool.push(
          pick(random, [
            {
              tool: 'readFile' as const,
              say: `Rereading ${file} after the change.`,
              input: { path: file, ref: branch },
              result: `${file} (${lines(random)} lines)`,
            },
            {
              tool: 'runTests' as const,
              say: 'Running the suite again.',
              input: { command: work.tests, branch },
              result: `ok: ${between(random, 40, 260)} passed in ${between(random, 8, 95)}s`,
            },
            {
              tool: 'searchCode' as const,
              say: 'Checking for other callers.',
              input: { query: file.slice(file.lastIndexOf('/') + 1), repo: 'alien-labs/cairn' },
              result: `${between(random, 1, 7)} matches`,
            },
          ]),
        );
      }
      const tail: Step[] = failing
        ? [
            {
              tool: 'runTests',
              say: 'Running the full suite before opening the pull request.',
              input: { command: work.tests, branch },
              error: failing,
            },
          ]
        : [
            {
              tool: 'runTests',
              say: 'Running the full suite before opening the pull request.',
              input: { command: work.tests, branch },
              result: `ok: ${between(random, 120, 640)} passed in ${between(random, 20, 180)}s`,
            },
            {
              tool: 'openPullRequest',
              say: `Opening the pull request.`,
              input: {
                repo: 'alien-labs/cairn',
                head: branch,
                base: 'main',
                title: seedFor(seed.tasks[0]).title,
                draft: seedFor(seed.tasks[0]).status === 'started',
              },
              result: `Opened #${work.pr} from ${branch} into main.`,
            },
          ];
      steps.push(...pool.slice(0, Math.max(0, count - 1 - tail.length)), ...tail);
      break;
    }

    case 'review': {
      steps.push({
        tool: 'readPullRequest',
        say: `Reading #${work.pr}.`,
        input: { repo: 'alien-labs/cairn', number: work.pr },
        result: `#${work.pr}: ${between(random, 8, 24)} files changed, +${between(random, 600, 1400)} -${between(random, 100, 400)}`,
      });
      for (const file of work.files) {
        steps.push({
          tool: 'readFile',
          say: `Reading ${file} in the pull request.`,
          input: { path: file, ref: `pull/${work.pr}/head` },
          result: `${file} (${lines(random)} lines)`,
        });
      }
      steps.push({
        tool: 'runTests',
        say: 'Running the suite and the dry-run backfill.',
        input: { command: work.tests, ref: `pull/${work.pr}/head` },
        result: 'ok: 1,186 passed in 212s. backfill: 2,418,903 keys, 0 missing, 0 duplicate',
      });
      steps.push({
        tool: 'reviewPullRequest',
        say: 'Approving with one comment.',
        input: { number: work.pr, event: 'APPROVE', comments: 1 },
        result: `Review submitted on #${work.pr}.`,
      });
      break;
    }

    case 'docs': {
      steps.push({
        tool: 'queryDatabase',
        say: 'Looking for the sources in this space.',
        input: { query: work.sources.join(' OR ') },
        result: `${work.sources.length + between(random, 0, 3)} objects`,
      });
      for (const source of work.sources) {
        steps.push({
          tool: 'readDocument',
          say: `Reading ${source}.`,
          input: { name: source },
          result: `${source}: ${between(random, 300, 2400)} words`,
        });
      }
      while (steps.length < count - 1) {
        steps.push({
          tool: 'writeDocument',
          say: pick(random, [
            'Writing the next section.',
            'Tightening what I have so far.',
            'Adding the gaps I found.',
          ]),
          input: { name: work.doc, section: between(random, 1, 6) },
          result: `${work.doc}: ${between(random, 120, 900)} words`,
        });
      }
      steps.push({
        tool: 'writeDocument',
        say: 'Finishing the draft.',
        input: { name: work.doc },
        result: `${work.doc} saved.`,
      });
      break;
    }

    case 'triage': {
      steps.push(
        {
          tool: 'searchMailbox',
          say: 'Reading what came in since the last sweep.',
          input: { query: 'newer_than:7d -label:triaged' },
          result: `${between(random, 6, 40)} messages; relevant: ${work.sources.join('; ')}`,
        },
        {
          tool: 'searchIssues',
          say: 'Checking open issues without a task.',
          input: { repo: 'alien-labs/cairn', query: 'is:open no:project' },
          result: `${between(random, 2, 12)} issues`,
        },
      );
      break;
    }
  }
  return steps;
};

/** Lays steps out across `[begin, end]`, leaving each step's wait as a gap after it. */
const layout = (
  steps: ReadonlyArray<Step>,
  begin: number,
  end: number,
  random: Random,
  pid: () => string,
): PlannedStep[] => {
  const waits = steps.reduce((total, step) => total + minutes(step.wait ?? 0), 0);
  const slot = (end - begin - waits - 60_000) / steps.length;
  let cursor = begin + 20_000;
  return steps.map((step) => {
    const span = Math.max(2_000, Math.round(slot * (0.25 + 0.5 * random())));
    const wait = minutes(step.wait ?? 0);
    const planned: PlannedStep = {
      ...step,
      pid: pid(),
      toolCallId: toolCallId(random),
      at: cursor,
      end: cursor + span + (step.delegate ? wait : 0),
      ...(step.wait && !step.delegate && { resumedAt: cursor + span + wait - 30_000 }),
    };
    cursor += slot + wait;
    return planned;
  });
};

const statusStep = (moves: ReadonlyArray<Move>, say: string): Step => ({
  tool: 'updateTasks',
  say,
  input: { changes: moves.map(({ task, to }) => ({ task: seedFor(task).title, status: to })) },
  result: moves.map(({ task, to }) => `${seedFor(task).title}: ${to}`).join('\n'),
  moves,
});

/** The steps of one request: pick the tasks up, work, put them down. */
const requestSteps = (seed: RunSeed, random: Random, retry: boolean): Step[] => {
  const tasks = seed.tasks;
  if (seed.work.kind === 'triage') {
    const work = workSteps(seed, random, 2, undefined);
    return [
      ...work,
      ...tasks.map((task) => ({
        ...statusStep([{ task, to: initialStatus(seedFor(task)) }], 'Filing a task for it.'),
        input: {
          changes: [{ create: true, title: seedFor(task).title, status: initialStatus(seedFor(task)) }],
        },
      })),
      {
        tool: 'labelIssue' as const,
        say: 'Labelling what I filed.',
        input: { labels: ['triaged', seed.project] },
        result: `Labelled ${tasks.length} item${tasks.length === 1 ? '' : 's'}.`,
      },
    ];
  }

  const from = retry ? 'failed' : undefined;
  const start = statusStep(
    tasks.map((task) => ({ task, from: from ?? initialStatus(seedFor(task)), to: 'started' as const })),
    retry ? 'Picking the task up again.' : 'Starting the task.',
  );
  const finals = tasks.flatMap((task) => {
    const to = finalMove(task);
    return to ? [{ task, from: 'started' as const, to }] : [];
  });
  const end = finals.length > 0 ? [statusStep(finals, `Moving the task to ${finals[0].to}.`)] : [];
  const error = retry ? seed.retry?.error : seed.error;

  const middle: Step[] = [];
  const question = seed.question;
  if (question && !retry) {
    const task = tasks[0];
    middle.push(
      {
        tool: 'askQuestion',
        say: 'I need a decision before going further.',
        input: { question: question.text, options: question.options },
        result: `Asked ${question.to}; waiting for an answer.`,
        question: { ...question, task },
      },
      {
        ...statusStep([{ task, from: 'started', to: 'blocked' }], 'Blocked until there is an answer.'),
        wait: question.wait,
      },
      statusStep([{ task, from: 'blocked', to: 'started' }], 'Answered; carrying on.'),
    );
  }
  if (seed.delegate && !retry) {
    const delegated = RUN_SEEDS.find((run) => run.key === seed.delegate)!;
    middle.push({
      tool: 'delegateTask',
      say: 'Handing the pull request to Reviewer.',
      input: { task: seedFor(delegated.tasks[0]).title, agent: 'Reviewer' },
      result: delegated.summary,
      delegate: delegated.key,
      wait: delegated.minutes + 1,
    });
  }

  const fixed = 2 + middle.length + end.length;
  const extra = seed.question && !retry ? 1 : 0;
  const requests = seed.retry ? 2 + 2 * 6 : seed.followUp ? 2 : 0;
  const budget = retry ? 6 : Math.floor((MAX_MESSAGES - 2 - extra - requests) / 2);
  const target = Math.min(budget, Math.max(3, Math.round(3 + (seed.minutes / 15) * (0.6 + 0.4 * random()))));
  const work = workSteps(seed, random, Math.max(2, target - fixed + 1), error);
  // A delegation or question lands after the pull request is open, before the task is put down.
  const split = question ? Math.min(3, work.length - 1) : work.length;
  return [start, ...work.slice(0, split), ...middle, ...work.slice(split), ...end];
};

const startOf = (
  seed: RunSeed,
  now: number,
  planned: ReadonlyMap<string, PlannedRun>,
): { begin: number; parentPid?: string } => {
  if (Array.isArray(seed.start)) {
    const [days, hour, minute] = seed.start as readonly [number, number, number];
    return { begin: at(now, days, hour, minute) };
  }
  const { delegatedBy } = seed.start as { delegatedBy: string };
  const parent = planned.get(delegatedBy)?.delegation;
  if (!parent) {
    throw new Error(`Run ${seed.key} is delegated by ${delegatedBy}, which is not planned first`);
  }
  return { begin: parent.spawnedAt + 30_000, parentPid: parent.parentPid };
};

/** Where a session's steps split between its first request and its follow-up, keeping a question with its answer. */
const followUpCut = (steps: ReadonlyArray<Step>): number => {
  let cut = Math.ceil(steps.length / 2);
  while (cut < steps.length - 1 && (steps[cut - 1].question || (steps[cut - 1].wait && !steps[cut - 1].delegate))) {
    cut++;
  }
  return cut;
};

export const planRuns = (now: number): Plan => {
  const planned = new Map<string, PlannedRun>();
  for (const seed of RUN_SEEDS) {
    const random = prng(seed.key);
    const pid = () => processId(random);
    const firstPid = pid();
    const { begin, parentPid } = startOf(seed, now, planned);
    const end = begin + minutes(seed.minutes);
    const steps = requestSteps(seed, random, false);
    const cut = seed.followUp ? followUpCut(steps) : steps.length;
    const title = seedFor(seed.tasks[0]).title;
    const first: PlannedRequest = {
      pid: firstPid,
      ...(parentPid && { parentPid }),
      begin,
      end,
      ...(seed.error && { error: seed.error }),
      brief: { at: begin - 2_000, text: seed.brief },
      summary: {
        at: end - 5_000,
        text: seed.followUp ? 'Stopping here for today; the work so far is on the branch.' : seed.summary,
      },
      steps: layout(steps.slice(0, cut), begin, end, random, pid),
    };
    const requests = [first];
    if (seed.followUp) {
      const followBegin = begin + seed.followUp.days * DAY;
      const followEnd = followBegin + minutes(seed.followUp.minutes);
      requests.push({
        pid: pid(),
        begin: followBegin,
        end: followEnd,
        brief: { at: followBegin - 2_000, text: `Carry on with "${title}" from where you stopped.` },
        summary: { at: followEnd - 5_000, text: seed.summary },
        steps: layout(steps.slice(cut), followBegin, followEnd, random, pid),
      });
    }
    if (seed.retry) {
      const retryBegin = end + minutes(seed.retry.after);
      const retryEnd = retryBegin + minutes(seed.retry.minutes);
      requests.push({
        pid: pid(),
        begin: retryBegin,
        end: retryEnd,
        error: seed.retry.error,
        brief: { at: retryBegin - 2_000, text: seed.retry.brief },
        summary: { at: retryEnd - 5_000, text: seed.retry.summary },
        steps: layout(requestSteps(seed, random, true), retryBegin, retryEnd, random, pid),
      });
    }
    const delegating = requests.find((request) => request.steps.some((step) => step.delegate));
    const delegateStep = delegating?.steps.find((step) => step.delegate);
    const delegation = delegating &&
      delegateStep && {
        run: delegateStep.delegate!,
        pid: delegatedPid(delegateStep.delegate!),
        parentPid: delegating.pid,
        spawnedAt: delegateStep.at + 1_000,
        completedAt: delegateStep.end - 10_000,
      };
    planned.set(seed.key, { seed, requests, ...(delegation && { delegation }) });
  }

  const moves = new Map<string, Array<{ at: number; from?: Task.Status; to: Task.Status; agent: AgentKey }>>();
  const filed = new Map<string, number>();
  for (const run of planned.values()) {
    for (const request of run.requests) {
      for (const step of request.steps) {
        for (const move of step.moves ?? []) {
          const time = eventTime(step);
          if (move.from === undefined) {
            filed.set(move.task, time);
          } else {
            moves.set(move.task, [
              ...(moves.get(move.task) ?? []),
              { at: time, from: move.from, to: move.to, agent: run.seed.agent },
            ]);
          }
        }
      }
    }
  }

  return { runs: [...planned.values()], timeline: { moves, filed } };
};

/** When a step's status moves land: midway through the call. */
export const eventTime = (step: PlannedStep): number => Math.round((step.at + step.end) / 2);

/** A delegated run's own pid is fixed by its key, so the delegating run can name it before it is planned. */
export const delegatedPid = (key: string): string => processId(prng(key));

//
// Chats and traces
//

/** The kind `getOrCreateTraceFeed` gives the space's trace feed. */
const TRACE_FEED_KIND = 'dxos.org.feed.trace';

export type HistoryInput = {
  readonly team: TeamProvides;
  readonly projects: Record<ProjectKey, Project.Project>;
  readonly tasks: Record<TaskKey, Task.Task>;
  readonly plan: Plan;
};

export type HistoryResult = {
  readonly chats: Record<string, Chat.Chat>;
  readonly trace: Feed.Feed;
};

const text = (value: string): ContentBlock.Text => ({ _tag: 'text', text: value });

const event = <T>(type: Trace.EventType<T>, timestamp: number, data: T): Trace.Event => ({
  type: type.key,
  timestamp,
  data,
});

/** The chat feed: the brief, a call and its result per step, any answer, and the closing summary. */
const makeMessages = (
  run: PlannedRun,
  { team }: HistoryInput,
  delegator: Agent.Agent | undefined,
): Message.Message[] => {
  const { seed } = run;
  const agent = team.agents[seed.agent];
  const assistant = { role: 'assistant' as const, name: agent.name, identityDid: agent.did };
  const messages: Message.Message[] = [];
  for (const [index, request] of run.requests.entries()) {
    const asker =
      index === 0 && delegator
        ? { role: 'user' as const, name: delegator.name, identityDid: delegator.did }
        : personActor(team.people[seed.by]);
    messages.push(Message.make({ created: iso(request.brief.at), sender: asker, blocks: [text(request.brief.text)] }));
    for (const step of request.steps) {
      const tool = TOOLS[step.tool];
      messages.push(
        Message.make({
          created: iso(step.at),
          sender: assistant,
          blocks: [
            text(step.say),
            {
              _tag: 'toolCall',
              toolCallId: step.toolCallId,
              name: tool.name,
              input: JSON.stringify(step.input),
              providerExecuted: false,
              operationKey: tool.key,
              operationName: tool.label,
              operationIcon: tool.icon,
            },
          ],
        }),
        Message.make({
          created: iso(step.end),
          sender: { role: 'tool' },
          blocks: [
            {
              _tag: 'toolResult',
              toolCallId: step.toolCallId,
              name: tool.name,
              ...(step.error ? { error: step.error } : { result: step.result ?? '' }),
              providerExecuted: false,
            },
          ],
        }),
      );
      const question = seed.question;
      if (step.resumedAt !== undefined && question) {
        messages.push(
          Message.make({
            created: iso(step.resumedAt),
            sender: personActor(team.people[question.to]),
            blocks: [text(question.answer)],
          }),
        );
      }
    }
    messages.push(
      Message.make({ created: iso(request.summary.at), sender: assistant, blocks: [text(request.summary.text)] }),
    );
  }
  return messages;
};

/** The run's trace: one message for the agent's own events and one per tool call, as the runtime batches them. */
const makeTrace = (
  run: PlannedRun,
  { team, tasks }: HistoryInput,
  feed: Feed.Feed,
  questionId: string | undefined,
): Trace.Message[] => {
  const { seed } = run;
  const agent = team.agents[seed.agent];
  const conversation = Ref.make(feed);
  const messages: Trace.Message[] = [];
  for (const request of run.requests) {
    const ownEvents: Trace.Event[] = [event(Trace.AgentRequestBegin, request.begin, {})];
    if (run.delegation?.parentPid === request.pid) {
      const taskId = tasks[seedForRun(run.delegation.run).tasks[0]].id;
      ownEvents.push(
        event(Trace.DelegationSpawned, run.delegation.spawnedAt, { taskId, pid: run.delegation.pid }),
        event(Trace.DelegationCompleted, run.delegation.completedAt, {
          taskId,
          pid: run.delegation.pid,
          status: 'success',
          result: seedForRun(run.delegation.run).summary,
        }),
      );
    }

    for (const step of request.steps) {
      const tool = TOOLS[step.tool];
      const events: Trace.Event[] = [
        event(Trace.OperationStart, step.at, { key: tool.key, name: tool.label, icon: tool.icon }),
      ];
      if (step.question && questionId) {
        events.push(
          event(Trace.QuestionAsked, step.at + 500, {
            questionId,
            text: step.question.text,
            taskId: tasks[step.question.task].id,
            options: step.question.options.length,
          }),
        );
      }
      for (const move of step.moves ?? []) {
        const task = tasks[move.task];
        events.push(
          event(Trace.TaskStatusChanged, eventTime(step), {
            taskId: task.id,
            title: task.title,
            status: move.to,
            ...(move.from && { previousStatus: move.from }),
          }),
        );
      }
      events.push(
        event(Trace.OperationEnd, step.end, {
          key: tool.key,
          name: tool.label,
          icon: tool.icon,
          outcome: step.error ? 'failure' : 'success',
          ...(step.error && { error: step.error }),
        }),
      );
      messages.push(
        Obj.make(Trace.Message, {
          meta: { pid: step.pid, parentPid: request.pid, processName: tool.label, conversation },
          isEphemeral: false,
          events,
        }),
      );

      const question = seed.question;
      if (step.resumedAt !== undefined && question && questionId) {
        ownEvents.push(
          event(Trace.QuestionAnswered, step.resumedAt, {
            questionId,
            text: question.text,
            taskId: tasks[seed.tasks[0]].id,
            answer: question.answer,
          }),
        );
      }
    }

    ownEvents.push(
      event(Trace.AgentRequestEnd, request.end, {
        status: request.error ? 'error' : 'success',
        ...(request.error && { error: request.error }),
      }),
    );
    messages.unshift(
      Obj.make(Trace.Message, {
        meta: {
          pid: request.pid,
          ...(request.parentPid && { parentPid: request.parentPid }),
          processName: agent.name,
          conversation,
        },
        isEphemeral: false,
        events: ownEvents.sort((a, b) => a.timestamp - b.timestamp),
      }),
    );
  }
  return messages;
};

/** The question and its answer in the asking task's log, linked to the conversation to resume. */
const recordQuestion = (run: PlannedRun, { team, tasks }: HistoryInput, feed: Feed.Feed): string | undefined => {
  const question = run.seed.question;
  const steps = run.requests.flatMap((request) => request.steps);
  const asked = steps.find((step) => step.question);
  const resumed = steps.find((step) => step.resumedAt !== undefined);
  if (!question || !asked || resumed?.resumedAt === undefined) {
    return undefined;
  }
  const questionId = EntityId.random();
  const task = tasks[run.seed.tasks[0]];
  Obj.update(task, (task) => {
    task.history = [
      ...(task.history ?? []),
      {
        id: questionId,
        date: iso(asked.at + 500),
        actor: agentActor(team.agents[run.seed.agent]),
        event: 'question' as const,
        text: question.text,
        context: question.context,
        options: question.options.map((title) => ({ title })),
        conversation: Ref.make(feed),
      },
      {
        id: EntityId.random(),
        date: iso(resumed.resumedAt!),
        actor: personActor(team.people[question.to]),
        event: 'answer' as const,
        questionId,
        answer: question.answer,
      },
    ].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  });
  return questionId;
};

const seedForRun = (key: string): RunSeed => {
  const seed = RUN_SEEDS.find((run) => run.key === key);
  if (!seed) {
    throw new Error(`Unknown run: ${key}`);
  }
  return seed;
};

/** One chat per session, filed under its project, with its feed and its trace. */
export const makeHistory = (input: HistoryInput) =>
  Effect.gen(function* () {
    const { team, projects, tasks, plan } = input;
    const trace = yield* Database.add(
      Feed.make({ kind: TRACE_FEED_KIND, name: 'Execution Trace', namespace: 'trace' }),
    );
    const chats: Record<string, Chat.Chat> = {};
    const traceMessages: Trace.Message[] = [];
    for (const run of plan.runs) {
      const { seed } = run;
      const agent = team.agents[seed.agent];
      const project = projects[seed.project];
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(
        Chat.make({
          name: seed.name ?? `${agent.name}: ${seedFor(seed.tasks[0]).title}`,
          feed: Ref.make(feed),
          ...(project.instructions && { instructions: project.instructions }),
          tasks: seed.tasks.map((key) => Ref.make(tasks[key])),
        }),
      );
      Chat.linkCompanion({ chat, subject: project });
      chats[seed.key] = chat;

      const delegator = plan.runs.find((candidate) => candidate.delegation?.run === seed.key)?.seed.agent;
      yield* SampleSpace.appendToFeed(feed, makeMessages(run, input, delegator && team.agents[delegator]));
      const questionId = recordQuestion(run, input, feed);
      traceMessages.push(...makeTrace(run, input, feed, questionId));

      if (seed.agent !== 'triage') {
        for (const key of seed.tasks) {
          Obj.update(tasks[key], (task) => {
            task.assignee = agentActor(agent, chat);
          });
        }
      }
    }

    const firstEvent = (message: Trace.Message) => message.events[0]?.timestamp ?? 0;
    yield* SampleSpace.appendToFeed(
      trace,
      traceMessages.sort((a, b) => firstEvent(a) - firstEvent(b)),
    );
    return { chats, trace } satisfies HistoryResult;
  });
