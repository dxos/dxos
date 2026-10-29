//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/echo/Key';
import { type Actor, Milestone, Task, TaskSet } from '@dxos/types';

import { type AgentKey, type PersonKey, type Provides as TeamProvides } from '../team/index.ts';
import { personActor } from '../util.ts';
import { agentActor, at, iso } from './util.ts';

export type ProjectKey = 'cache' | 'billing' | 'soc2' | 'offsite';

export const PROJECT_KEYS: ReadonlyArray<ProjectKey> = ['cache', 'billing', 'soc2', 'offsite'];

const AGENT_KEYS = new Set<string>(['builder', 'reviewer', 'triage', 'scribe']);

export const isAgentKey = (key: AgentKey | PersonKey): key is AgentKey => AGENT_KEYS.has(key);

//
// Milestones
//

const MILESTONE_SEEDS = [
  {
    key: 'cacheBeta',
    project: 'cache',
    name: 'Cache v2 in beta',
    description: 'Three design partners on the v2 protocol and the sharded index.',
    target: -10,
  },
  {
    key: 'cacheShipped',
    project: 'cache',
    name: '1.8 shipped',
    description: 'Cairn 1.8 tagged, released notes out, every tenant on v2.',
    target: 2,
  },
  {
    key: 'meteringShadow',
    project: 'billing',
    name: 'Metering in shadow mode',
    description: 'Usage reaches Stripe Meters and shadow invoices match within 1%.',
    target: -12,
  },
  {
    key: 'usageInvoices',
    project: 'billing',
    name: 'Usage invoices live',
    description: 'The first real usage invoices go out with the November cycle.',
    target: 30,
  },
  {
    key: 'policiesApproved',
    project: 'soc2',
    name: 'Policies approved',
    description: 'Every policy in the set signed off by its owner.',
    target: 7,
  },
  {
    key: 'auditKickoff',
    project: 'soc2',
    name: 'Auditor kickoff',
    description: 'Evidence collected and the Type I window opened with the auditor.',
    target: 21,
  },
  {
    key: 'offsiteBooked',
    project: 'offsite',
    name: 'Venue and travel booked',
    description: 'Lodge confirmed and everyone has a flight and a room.',
    target: 14,
  },
] as const;

type MilestoneKey = (typeof MILESTONE_SEEDS)[number]['key'];

//
// Tasks
//

/** A status move a person made, as `[daysAgo, hour, status, by]`. */
type Move = readonly [days: number, hour: number, status: Task.Status, by: PersonKey];

/** A note a person left in the log, as `[daysAgo, hour, by, text]`. */
type Note = readonly [days: number, hour: number, by: PersonKey, text: string];

export type TaskSeed = {
  readonly key: string;
  readonly project: ProjectKey;
  readonly title: string;
  readonly description: string;
  readonly status: Task.Status;
  readonly priority: Task.Priority;
  readonly estimate: Task.Estimate;
  readonly assignee: AgentKey | PersonKey;
  /** The person who signs off an agent's work. */
  readonly reviewer?: PersonKey;
  readonly milestone?: MilestoneKey;
  readonly dependsOn?: ReadonlyArray<string>;
  /** Key of the task this one is a subtask of. */
  readonly parent?: string;
  /** When and by whom the task was filed; `triage` tasks are dated by the Triage run that files them. */
  readonly created: readonly [days: number, hour: number, by: PersonKey] | 'triage';
  readonly moves?: ReadonlyArray<Move>;
  readonly notes?: ReadonlyArray<Note>;
};

export const TASK_SEEDS = [
  //
  // cache
  //
  {
    key: 'protoV2',
    project: 'cache',
    title: 'Freeze the v2 cache protocol',
    description:
      'Write down the v2 wire format (content-addressed PUT/GET, batched HEAD, range reads) and stop changing it. ' +
      'Every other 1.8 task builds against this.',
    status: 'done',
    priority: 'urgent',
    estimate: 'm',
    assignee: 'omar',
    milestone: 'cacheBeta',
    created: [60, 10, 'omar'],
    moves: [
      [60, 11, 'started', 'omar'],
      [55, 17, 'done', 'omar'],
    ],
  },
  {
    key: 'contentAddressing',
    project: 'cache',
    title: 'Content-address artifacts by BLAKE3 digest',
    description:
      'Key every stored blob by the BLAKE3 digest of its bytes instead of the client-supplied action key, so two ' +
      'builds producing the same output share one copy. Keep the v1 key as an alias until 1.9.',
    status: 'done',
    priority: 'high',
    estimate: 'l',
    assignee: 'builder',
    reviewer: 'omar',
    milestone: 'cacheBeta',
    created: [59, 14, 'omar'],
    moves: [[55, 11, 'done', 'omar']],
  },
  {
    key: 'casIndex',
    project: 'cache',
    title: 'Move the CAS index from SQLite to the sharded KV store',
    description:
      'The single SQLite index tops out at about 4k writes a second. Shard it by the first byte of the digest ' +
      'across the KV store, with a dual-write window and a backfill job.',
    status: 'done',
    priority: 'high',
    estimate: 'xl',
    assignee: 'builder',
    reviewer: 'omar',
    milestone: 'cacheBeta',
    dependsOn: ['contentAddressing'],
    created: [56, 9, 'omar'],
    moves: [[42, 11, 'done', 'omar']],
  },
  {
    key: 'reviewCasIndex',
    project: 'cache',
    parent: 'casIndex',
    title: 'Review the CAS index migration pull request',
    description:
      'Read the sharding change, run the full suite plus the backfill against a copy of the staging index, and ' +
      'report anything that loses or duplicates a key.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'reviewer',
    reviewer: 'omar',
    milestone: 'cacheBeta',
    created: [46, 16, 'omar'],
    moves: [[42, 10, 'done', 'omar']],
  },
  {
    key: 'cacheKeyCollision',
    project: 'cache',
    title: 'Fix cache-key collision on concurrent writes',
    description:
      'Two writers racing on the same action key could each commit half an entry, so a reader got an index row ' +
      "pointing at the other writer's blob. This is what corrupted Okapi's cache. Make the index write a " +
      'compare-and-set on the digest.',
    status: 'done',
    priority: 'urgent',
    estimate: 'm',
    assignee: 'builder',
    reviewer: 'omar',
    milestone: 'cacheBeta',
    created: [34, 9, 'omar'],
    moves: [[32, 15, 'done', 'omar']],
  },
  {
    key: 'collisionRegressionTest',
    project: 'cache',
    parent: 'cacheKeyCollision',
    title: 'Regression test for concurrent writes to one key',
    description:
      'A test that runs 64 writers against one action key for 30 seconds and fails on any index row whose digest ' +
      'does not match its blob.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'builder',
    reviewer: 'anika',
    milestone: 'cacheBeta',
    created: [34, 9, 'omar'],
    moves: [[30, 10, 'done', 'anika']],
  },
  {
    key: 'r2Backend',
    project: 'cache',
    title: 'R2 storage backend behind the blob-store interface',
    description:
      'Implement the BlobStore interface on Cloudflare R2 with multipart uploads for blobs over 64 MB. S3 stays ' +
      'the default; R2 is chosen per tenant.',
    status: 'done',
    priority: 'medium',
    estimate: 'l',
    assignee: 'builder',
    reviewer: 'felix',
    milestone: 'cacheShipped',
    created: [40, 15, 'felix'],
    moves: [[36, 14, 'done', 'felix']],
  },
  {
    key: 'r2Integration',
    project: 'cache',
    title: 'Integration tests against R2',
    description:
      'Run the blob-store conformance suite against a real R2 bucket in CI, including multipart abort and the ' +
      'lifecycle rule that cleans up incomplete uploads.',
    status: 'failed',
    priority: 'high',
    estimate: 'm',
    assignee: 'builder',
    reviewer: 'felix',
    milestone: 'cacheShipped',
    dependsOn: ['r2Backend'],
    created: [30, 10, 'felix'],
    notes: [
      [
        23,
        9,
        'omar',
        'Both runs failed in TestMultipartAbort, and it passes locally. The bucket lifecycle rule races the abort: ' +
          'R2 sometimes reaps the upload first and the test sees a 404 instead of a clean abort. Not a backend bug. ' +
          'Felix and I will rewrite the test against a bucket without the rule before anyone reruns this.',
      ],
    ],
  },
  {
    key: 'r2Rollout',
    project: 'cache',
    title: 'Switch beta tenants to the R2 backend',
    description: 'Move the three beta tenants to R2 one at a time, with a 48-hour soak each and a rollback switch.',
    status: 'blocked',
    priority: 'medium',
    estimate: 's',
    assignee: 'builder',
    milestone: 'cacheShipped',
    dependsOn: ['r2Integration'],
    created: 'triage',
    moves: [[23, 10, 'blocked', 'omar']],
    notes: [[23, 10, 'omar', 'Blocked until the R2 integration tests pass. No tenant moves on a red suite.']],
  },
  {
    key: 'clientRetry',
    project: 'cache',
    title: 'Exponential backoff in the CLI client on 429 and 503',
    description:
      'The CLI retries immediately and makes a throttled server worse. Back off from 100 ms to 10 s with jitter ' +
      'and give up after 6 attempts, falling back to a local build.',
    status: 'done',
    priority: 'medium',
    estimate: 's',
    assignee: 'builder',
    reviewer: 'felix',
    milestone: 'cacheBeta',
    created: [52, 11, 'felix'],
    moves: [[49, 10, 'done', 'felix']],
  },
  {
    key: 'migrationGuide',
    project: 'cache',
    title: 'Write the cache v1 to v2 migration guide',
    description:
      'One page for customers: what changes for them (nothing, unless they pin the protocol), how to opt in early, ' +
      'and how to roll back.',
    status: 'done',
    priority: 'medium',
    estimate: 's',
    assignee: 'scribe',
    reviewer: 'lucia',
    milestone: 'cacheShipped',
    created: [20, 13, 'lucia'],
    moves: [[17, 15, 'done', 'lucia']],
  },
  {
    key: 'evictionPolicy',
    project: 'cache',
    title: 'Size-aware LRU eviction for the edge tier',
    description:
      'The edge tier evicts by entry count, so one 2 GB toolchain image pushes out thousands of small objects. ' +
      'Evict by bytes, weighted by hit count over the last 24 hours.',
    status: 'review',
    priority: 'high',
    estimate: 'l',
    assignee: 'builder',
    reviewer: 'omar',
    milestone: 'cacheShipped',
    dependsOn: ['casIndex'],
    created: [20, 10, 'omar'],
  },
  {
    key: 'signedUrls',
    project: 'cache',
    title: 'Signed download URLs with a 15-minute expiry',
    description:
      'Large artifacts should download straight from storage. Hand the client a signed URL that expires in 15 ' +
      'minutes and is bound to the tenant, instead of streaming through the API.',
    status: 'review',
    priority: 'high',
    estimate: 'm',
    assignee: 'builder',
    reviewer: 'anika',
    milestone: 'cacheShipped',
    created: [15, 10, 'anika'],
  },
  {
    key: 'evictionMetrics',
    project: 'cache',
    title: 'Export eviction and hit-rate metrics to Prometheus',
    description:
      'Per-tenant hit rate, bytes evicted and eviction reason, scraped every 30 seconds. Anika wants these before ' +
      'the new eviction policy reaches production.',
    status: 'started',
    priority: 'medium',
    estimate: 's',
    assignee: 'builder',
    milestone: 'cacheShipped',
    created: [14, 15, 'anika'],
  },
  {
    key: 'cliWarmCache',
    project: 'cache',
    title: "A `cairn warm` command that prefetches a branch's artifacts",
    description:
      'Given a branch, fetch the artifacts its last green build produced into the local cache, so the first build ' +
      'on a fresh laptop is not a cold one.',
    status: 'started',
    priority: 'low',
    estimate: 'm',
    assignee: 'builder',
    milestone: 'cacheShipped',
    created: [10, 14, 'felix'],
  },
  {
    key: 'releaseNotesDraft',
    project: 'cache',
    title: 'Draft the Cairn 1.8 release notes',
    description:
      'From the merged pull requests and the migration guide, draft notes for 1.8: what is new, what changed, ' +
      'what to do. Customers read the first three lines and nothing else, so put the v2 cache there.',
    status: 'review',
    priority: 'medium',
    estimate: 's',
    assignee: 'scribe',
    reviewer: 'lucia',
    milestone: 'cacheShipped',
    created: [5, 9, 'lucia'],
  },
  {
    key: 'release18',
    project: 'cache',
    title: 'Cut the Cairn 1.8 release',
    description:
      'Tag 1.8.0, publish the CLI to npm and Homebrew, roll the server out region by region, and post the release ' +
      'notes once the last region is green.',
    status: 'todo',
    priority: 'high',
    estimate: 'm',
    assignee: 'builder',
    milestone: 'cacheShipped',
    dependsOn: ['evictionPolicy', 'signedUrls', 'releaseNotesDraft'],
    created: 'triage',
  },
  {
    key: 'dashboardPlugin',
    project: 'cache',
    title: 'Ship the Cairn dashboard as a Composer plugin',
    description:
      'Move the tokens, usage and hit-rate pages into a Composer plugin that reads the edge gateway with the ' +
      "workspace API token, so the dashboard opens next to the team's projects and agent traces. Retire the " +
      'standalone web app once the plugin covers its pages.',
    status: 'todo',
    priority: 'medium',
    estimate: 'm',
    assignee: 'builder',
    created: 'triage',
  },
  {
    key: 'gcOrphans',
    project: 'cache',
    title: 'Garbage-collect blobs orphaned by failed uploads',
    description:
      'An upload that dies after the blob lands but before the index write leaves a blob nothing points at. Sweep ' +
      'blobs older than a day with no index row.',
    status: 'backlog',
    priority: 'low',
    estimate: 's',
    assignee: 'builder',
    created: 'triage',
  },
  {
    key: 'betaInvites',
    project: 'cache',
    title: 'Invite three design partners to the cache v2 beta',
    description: 'Northpine, Okapi and one smaller team. Each gets a Slack channel and a weekly check-in.',
    status: 'started',
    priority: 'medium',
    estimate: 's',
    assignee: 'lucia',
    milestone: 'cacheBeta',
    created: 'triage',
    moves: [[5, 10, 'started', 'lucia']],
  },

  //
  // billing
  //
  {
    key: 'priceModel',
    project: 'billing',
    title: 'Decide the per-GB and per-hit prices',
    description:
      'Pick list prices for GB-month stored and per thousand cache hits so that a median customer pays within 10% ' +
      'of their current flat rate.',
    status: 'done',
    priority: 'high',
    estimate: 'm',
    assignee: 'june',
    milestone: 'meteringShadow',
    created: 'triage',
    moves: [
      [56, 10, 'started', 'june'],
      [49, 16, 'done', 'june'],
    ],
  },
  {
    key: 'meterEvents',
    project: 'billing',
    title: 'Emit a metering event per cache hit and per GB stored',
    description:
      'Count hits at the API edge and sample stored bytes hourly per tenant. Events go to a local queue first so a ' +
      'Stripe outage never drops usage.',
    status: 'done',
    priority: 'high',
    estimate: 'm',
    assignee: 'builder',
    reviewer: 'june',
    milestone: 'meteringShadow',
    created: [55, 10, 'june'],
    moves: [[53, 11, 'done', 'june']],
  },
  {
    key: 'meterPipeline',
    project: 'billing',
    title: 'Batch metering events to Stripe Meters every 5 minutes',
    description:
      'Drain the local queue in batches of up to 500 events with an idempotency key per batch, so a retried batch ' +
      'is never billed twice.',
    status: 'done',
    priority: 'high',
    estimate: 'm',
    assignee: 'builder',
    reviewer: 'june',
    milestone: 'meteringShadow',
    dependsOn: ['meterEvents'],
    created: [50, 15, 'june'],
    moves: [[42, 10, 'done', 'june']],
  },
  {
    key: 'stripeCustomerMap',
    project: 'billing',
    title: 'Map Alien Labs tenants to Stripe customers',
    description:
      'Every tenant needs a Stripe customer and a usage subscription. Most map one to one; a few organizations run ' +
      'several tenants.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'builder',
    reviewer: 'june',
    milestone: 'meteringShadow',
    created: [42, 9, 'june'],
    moves: [[36, 10, 'done', 'june']],
  },
  {
    key: 'webhookIdempotency',
    project: 'billing',
    title: 'Idempotent handling of Stripe invoice webhooks',
    description:
      'Stripe delivers webhooks at least once. Record each event id and make `invoice.paid` and ' +
      '`invoice.payment_failed` handlers no-ops on a repeat.',
    status: 'done',
    priority: 'medium',
    estimate: 's',
    assignee: 'builder',
    reviewer: 'june',
    milestone: 'usageInvoices',
    created: [36, 11, 'june'],
    moves: [[28, 10, 'done', 'june']],
  },
  {
    key: 'shadowInvoices',
    project: 'billing',
    title: 'Shadow invoices for October next to the flat-rate bill',
    description:
      'For every tenant, compute what October would cost on usage pricing and store it beside the real invoice. ' +
      'Flag any tenant whose bill moves by more than 25%.',
    status: 'review',
    priority: 'high',
    estimate: 'm',
    assignee: 'builder',
    reviewer: 'june',
    milestone: 'meteringShadow',
    dependsOn: ['meterPipeline', 'stripeCustomerMap'],
    created: [25, 14, 'june'],
  },
  {
    key: 'usageDashboard',
    project: 'billing',
    title: 'Usage page in the dashboard: GB stored and hits this cycle',
    description:
      "A page under Billing that shows this cycle's stored GB, hits and projected bill, from the same numbers the " +
      'invoice uses.',
    status: 'started',
    priority: 'medium',
    estimate: 'm',
    assignee: 'builder',
    milestone: 'usageInvoices',
    created: [14, 16, 'tomas'],
  },
  {
    key: 'billingFaq',
    project: 'billing',
    title: 'Billing FAQ for existing customers',
    description:
      'Ten questions customers will ask about usage pricing, answered in two sentences each. Lucía owns the tone.',
    status: 'done',
    priority: 'medium',
    estimate: 'xs',
    assignee: 'scribe',
    reviewer: 'lucia',
    milestone: 'usageInvoices',
    created: [20, 11, 'lucia'],
    moves: [[14, 10, 'done', 'lucia']],
  },
  {
    key: 'dunning',
    project: 'billing',
    title: 'Dunning emails for failed usage invoices',
    description: 'Three reminders over 14 days, then the tenant drops to read-only. Copy comes from the FAQ.',
    status: 'todo',
    priority: 'medium',
    estimate: 's',
    assignee: 'builder',
    milestone: 'usageInvoices',
    created: 'triage',
  },
  {
    key: 'pricingPage',
    project: 'billing',
    title: 'Update the pricing page for usage-based plans',
    description: 'Replace the three flat tiers with a calculator: GB stored and hits in, monthly estimate out.',
    status: 'todo',
    priority: 'medium',
    estimate: 'm',
    assignee: 'tomas',
    milestone: 'usageInvoices',
    created: 'triage',
  },
  {
    key: 'customerComms',
    project: 'billing',
    title: "Give existing customers 30 days' notice of the switch",
    description: 'One email per account owner, plus a call for the five largest accounts.',
    status: 'backlog',
    priority: 'high',
    estimate: 's',
    assignee: 'lucia',
    milestone: 'usageInvoices',
    created: 'triage',
  },
  {
    key: 'taxReview',
    project: 'billing',
    title: 'Confirm VAT handling for EU tenants with Stripe Tax',
    description: 'Check that reverse charge applies to our B2B tenants in the EU and that invoices show it.',
    status: 'started',
    priority: 'medium',
    estimate: 's',
    assignee: 'june',
    milestone: 'usageInvoices',
    created: 'triage',
    moves: [[30, 14, 'started', 'june']],
  },

  //
  // soc2
  //
  {
    key: 'auditorSelection',
    project: 'soc2',
    title: 'Pick an auditor for the Type I report',
    description: 'Three quotes, one call each. Price matters less than whether they have audited a company our size.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'astrid',
    milestone: 'auditKickoff',
    created: 'triage',
    moves: [
      [50, 10, 'started', 'astrid'],
      [41, 16, 'done', 'astrid'],
    ],
  },
  {
    key: 'accessPolicy',
    project: 'soc2',
    title: 'Draft the access control policy',
    description:
      'Who gets production access, how it is granted and revoked, and the quarterly review. Write what we actually ' +
      'do, then flag the gaps.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'scribe',
    reviewer: 'anika',
    milestone: 'policiesApproved',
    created: [53, 9, 'anika'],
    moves: [[50, 11, 'done', 'anika']],
  },
  {
    key: 'incidentPolicy',
    project: 'soc2',
    title: 'Draft the incident response policy',
    description:
      'Severity levels, who is paged, the 24-hour customer notice and the postmortem. Use the Okapi incident as the ' +
      'worked example.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'scribe',
    reviewer: 'anika',
    milestone: 'policiesApproved',
    created: [53, 9, 'anika'],
    moves: [[46, 10, 'done', 'anika']],
  },
  {
    key: 'changePolicy',
    project: 'soc2',
    title: 'Draft the change management policy',
    description:
      'Every production change goes through a reviewed pull request and CI. Describe the emergency path and how it ' +
      'is recorded afterwards.',
    status: 'done',
    priority: 'medium',
    estimate: 's',
    assignee: 'scribe',
    reviewer: 'omar',
    milestone: 'policiesApproved',
    created: [44, 13, 'anika'],
    moves: [[39, 10, 'done', 'omar']],
  },
  {
    key: 'vendorPolicy',
    project: 'soc2',
    title: 'Draft the vendor management policy',
    description: 'List the vendors that touch customer data, what each one holds, and how we review them yearly.',
    status: 'review',
    priority: 'medium',
    estimate: 'xs',
    assignee: 'scribe',
    reviewer: 'anika',
    milestone: 'policiesApproved',
    created: [30, 10, 'anika'],
  },
  {
    key: 'dataRetention',
    project: 'soc2',
    title: 'Draft the data retention policy',
    description:
      "How long we keep build artifacts, logs and billing records, and what happens to a deleted tenant's data.",
    status: 'started',
    priority: 'medium',
    estimate: 's',
    assignee: 'scribe',
    milestone: 'policiesApproved',
    created: [12, 9, 'anika'],
  },
  {
    key: 'meridianQuestionnaire',
    project: 'soc2',
    title: 'Answer the Meridian security questionnaire',
    description:
      "Meridian's 140-question security review gates their enterprise trial. Answer from the policy set and mark " +
      'every answer that depends on a policy not yet approved.',
    status: 'blocked',
    priority: 'urgent',
    estimate: 'm',
    assignee: 'scribe',
    milestone: 'auditKickoff',
    dependsOn: ['vendorPolicy'],
    created: [10, 15, 'astrid'],
  },
  {
    key: 'mfaEnforcement',
    project: 'soc2',
    title: 'Enforce MFA on the dashboard for organization owners',
    description: 'Owners without a second factor get a setup screen on next sign-in and no way past it.',
    status: 'failed',
    priority: 'high',
    estimate: 's',
    assignee: 'builder',
    reviewer: 'anika',
    milestone: 'auditKickoff',
    created: [7, 10, 'anika'],
  },
  {
    key: 'policyIndex',
    project: 'soc2',
    title: 'Compile the policy set into one document',
    description: 'One document with every approved policy, an owner per policy and a review date, for the auditor.',
    status: 'todo',
    priority: 'medium',
    estimate: 'xs',
    assignee: 'scribe',
    milestone: 'auditKickoff',
    dependsOn: ['accessPolicy', 'incidentPolicy', 'changePolicy', 'vendorPolicy'],
    created: 'triage',
  },
  {
    key: 'evidenceCollection',
    project: 'soc2',
    title: 'Collect evidence screenshots for the auditor',
    description: 'Branch protection, MFA settings, the access review and an example postmortem, one folder each.',
    status: 'todo',
    priority: 'medium',
    estimate: 'm',
    assignee: 'anika',
    milestone: 'auditKickoff',
    created: 'triage',
  },
  {
    key: 'pentest',
    project: 'soc2',
    title: 'Schedule the external penetration test',
    description: 'Book a two-week window before the audit. The report goes in the evidence folder.',
    status: 'blocked',
    priority: 'high',
    estimate: 's',
    assignee: 'anika',
    milestone: 'auditKickoff',
    created: 'triage',
    moves: [
      [30, 15, 'started', 'anika'],
      [20, 11, 'blocked', 'anika'],
    ],
    notes: [[20, 11, 'anika', 'The firm has no slot before the 20th of next month. Waiting on a cancellation.']],
  },
  {
    key: 'complianceScanner',
    project: 'soc2',
    title: 'Compare compliance automation tools',
    description: 'Is a compliance platform worth it for a ten-person company going for Type I? One page.',
    status: 'cancelled',
    priority: 'low',
    estimate: 'xs',
    assignee: 'scribe',
    reviewer: 'astrid',
    created: [35, 10, 'astrid'],
    moves: [[31, 9, 'cancelled', 'astrid']],
    notes: [[31, 9, 'astrid', 'A spreadsheet and the policy docs are enough for Type I. Revisit before Type II.']],
  },

  //
  // offsite
  //
  {
    key: 'bookVenue',
    project: 'offsite',
    title: 'Book Saltmarsh Lodge for three nights',
    description: 'Ten rooms, the big meeting room every day, and dinner on the first night.',
    status: 'done',
    priority: 'high',
    estimate: 's',
    assignee: 'astrid',
    milestone: 'offsiteBooked',
    created: [45, 10, 'astrid'],
    moves: [
      [44, 10, 'started', 'astrid'],
      [38, 15, 'done', 'astrid'],
    ],
  },
  {
    key: 'travel',
    project: 'offsite',
    title: 'Book flights from Lisbon and Toronto',
    description: 'Everyone lands by 15:00 on day one. Toronto flies overnight; Lisbon takes the morning flight.',
    status: 'started',
    priority: 'high',
    estimate: 'm',
    assignee: 'lucia',
    milestone: 'offsiteBooked',
    created: [30, 9, 'astrid'],
    moves: [[25, 11, 'started', 'lucia']],
  },
  {
    key: 'agenda',
    project: 'offsite',
    title: 'Draft the offsite agenda',
    description: 'Two days of planning, one afternoon off. 2027 roadmap on day one, how we work on day two.',
    status: 'started',
    priority: 'medium',
    estimate: 's',
    assignee: 'astrid',
    created: [30, 9, 'astrid'],
    moves: [[18, 14, 'started', 'astrid']],
  },
  {
    key: 'dietary',
    project: 'offsite',
    title: 'Collect dietary requirements',
    description: 'One form, everyone answers by the end of next week, results to Wren at the lodge.',
    status: 'todo',
    priority: 'medium',
    estimate: 'xs',
    assignee: 'ben',
    created: [20, 10, 'astrid'],
  },
  {
    key: 'activities',
    project: 'offsite',
    title: 'Pick one afternoon activity',
    description: 'Something outdoors that works in the rain. The lodge has kayaks and a list of walks.',
    status: 'backlog',
    priority: 'low',
    estimate: 'xs',
    assignee: 'ben',
    created: [20, 10, 'astrid'],
  },
  {
    key: 'swag',
    project: 'offsite',
    title: 'Order team hoodies',
    description: 'Alien Labs logo, one colour.',
    status: 'cancelled',
    priority: 'low',
    estimate: 'xs',
    assignee: 'kofi',
    created: [28, 16, 'kofi'],
    moves: [[21, 12, 'cancelled', 'kofi']],
    notes: [[21, 12, 'kofi', 'The supplier needs six weeks. Doing stickers instead, no task needed.']],
  },
] as const satisfies ReadonlyArray<TaskSeed>;

export type TaskKey = (typeof TASK_SEEDS)[number]['key'];

export const seedFor = (key: string): TaskSeed => {
  const seed = TASK_SEEDS.find((seed) => seed.key === key);
  if (!seed) {
    throw new Error(`Unknown task: ${key}`);
  }
  return seed;
};

/** A status move a run made, timed on the reference clock. */
export type RunMove = { readonly at: number; readonly from?: Task.Status; readonly to: Task.Status };

/** What the history partial tells the tasks partial: each agent run's moves, and when Triage filed what. */
export type TaskTimeline = {
  readonly moves: ReadonlyMap<string, ReadonlyArray<RunMove & { readonly agent: AgentKey }>>;
  readonly filed: ReadonlyMap<string, number>;
};

export type TasksInput = {
  readonly team: TeamProvides;
  readonly timeline: TaskTimeline;
  /** Subject of the Okapi incident thread, when the template includes inbox-crm. */
  readonly okapiIncident?: string;
};

export type TasksResult = {
  readonly taskSets: Record<ProjectKey, TaskSet.TaskSet>;
  readonly tasks: Record<TaskKey, Task.Task>;
};

const statusEntry = (date: string, actor: Actor.Actor, from: Task.Status | undefined, to: Task.Status) => ({
  id: EntityId.random(),
  date,
  actor,
  event: 'updated' as const,
  description: `Status changed from ${from ?? 'none'} to ${to}.`,
});

export const initialStatus = (seed: TaskSeed): Task.Status => (seed.status === 'backlog' ? 'backlog' : 'todo');

const makeTask = (
  seed: TaskSeed,
  { team, timeline, okapiIncident }: TasksInput,
  now: number,
  milestones: Record<MilestoneKey, Milestone.Milestone>,
): Task.Task => {
  const actorOf = (key: AgentKey | PersonKey) =>
    isAgentKey(key) ? agentActor(team.agents[key]) : personActor(team.people[key]);

  const filedAt = seed.created === 'triage' ? timeline.filed.get(seed.key) : at(now, seed.created[0], seed.created[1]);
  if (filedAt === undefined) {
    throw new Error(`No Triage run files ${seed.key}`);
  }
  const filedBy =
    seed.created === 'triage' ? agentActor(team.agents.triage) : personActor(team.people[seed.created[2]]);

  // Runs and people move the task in turn; the log interleaves them by time.
  const runMoves = (timeline.moves.get(seed.key) ?? []).map((move) => ({
    at: move.at,
    actor: agentActor(team.agents[move.agent]),
    from: move.from,
    to: move.to,
  }));
  const personMoves = (seed.moves ?? []).map(([days, hour, to, by]) => ({
    at: at(now, days, hour),
    actor: personActor(team.people[by]),
    from: undefined as Task.Status | undefined,
    to,
  }));
  const moves = [...runMoves, ...personMoves].sort((a, b) => a.at - b.at);
  let previous = initialStatus(seed);
  const statusEntries = moves.map((move) => {
    if (move.from !== undefined && move.from !== previous) {
      throw new Error(`Task ${seed.key} moves from ${move.from} while ${previous}`);
    }
    const entry = { at: move.at, entry: statusEntry(iso(move.at), move.actor, move.from ?? previous, move.to) };
    previous = move.to;
    return entry;
  });
  if (previous !== seed.status) {
    throw new Error(`Task ${seed.key} ends ${previous}, expected ${seed.status}`);
  }

  const notes = (seed.notes ?? []).map(([days, hour, by, text]) => ({
    at: at(now, days, hour) + 1,
    entry: {
      id: EntityId.random(),
      date: iso(at(now, days, hour) + 1),
      actor: personActor(team.people[by]),
      event: 'updated' as const,
      description: text,
    },
  }));

  const description =
    seed.key === 'cacheKeyCollision' && okapiIncident
      ? `${seed.description}\n\nBackground and the customer timeline are in the "${okapiIncident}" thread.`
      : seed.description;

  return Task.make({
    title: seed.title,
    description,
    status: seed.status,
    priority: seed.priority,
    estimate: seed.estimate,
    assignee: isAgentKey(seed.assignee)
      ? { identityDid: team.agents[seed.assignee].did, name: team.agents[seed.assignee].name }
      : personActor(team.people[seed.assignee]),
    ...(seed.reviewer && { reviewers: [personActor(team.people[seed.reviewer])] }),
    ...(seed.milestone && { milestone: Ref.make(milestones[seed.milestone]) }),
    history: [
      {
        at: filedAt,
        entry: {
          id: EntityId.random(),
          date: iso(filedAt),
          actor: filedBy,
          event: 'created' as const,
          description: seed.created === 'triage' ? 'Filed by Triage.' : `Filed by ${filedBy.name}.`,
        },
      },
      ...statusEntries,
      ...notes,
    ]
      .sort((a, b) => a.at - b.at)
      .map(({ entry }) => entry),
  });
};

/** One TaskSet per project, with its milestones, root tasks and subtasks. */
export const makeTasks = Effect.fnUntraced(function* ({ team, timeline, okapiIncident }: TasksInput) {
  const { now, daysFromNow } = yield* SampleSpace.Clock;
  const milestones = Object.fromEntries(
    MILESTONE_SEEDS.map((seed) => [
      seed.key,
      Milestone.make({
        name: seed.name,
        description: seed.description,
        targetDate: daysFromNow(seed.target).slice(0, 10),
      }),
    ]),
  ) as Record<MilestoneKey, Milestone.Milestone>;

  const tasks = Object.fromEntries(
    TASK_SEEDS.map((seed) => [seed.key, makeTask(seed, { team, timeline, okapiIncident }, now.getTime(), milestones)]),
  ) as Record<TaskKey, Task.Task>;

  const entries: Array<[ProjectKey, TaskSet.TaskSet]> = [];
  for (const project of PROJECT_KEYS) {
    const taskSet = yield* Database.add(TaskSet.make({ name: PROJECT_NAMES[project] }));
    const seeds: ReadonlyArray<TaskSeed> = TASK_SEEDS.filter((seed) => seed.project === project);
    yield* SampleSpace.children(
      taskSet,
      MILESTONE_SEEDS.filter((seed) => seed.project === project).map((seed) => milestones[seed.key]),
      (taskSet, refs) => {
        taskSet.milestones = refs;
      },
    );
    yield* SampleSpace.children(
      taskSet,
      seeds.filter((seed) => !seed.parent).map((seed) => tasks[seed.key as TaskKey]),
      (taskSet, refs) => {
        taskSet.tasks = refs;
      },
    );
    for (const parent of seeds) {
      const subtasks = seeds.filter((seed) => seed.parent === parent.key);
      if (subtasks.length > 0) {
        yield* SampleSpace.children(
          tasks[parent.key as TaskKey],
          subtasks.map((seed) => tasks[seed.key as TaskKey]),
          (task, refs) => {
            task.subtasks = refs;
          },
        );
      }
    }
    entries.push([project, taskSet]);
  }

  for (const seed of TASK_SEEDS as ReadonlyArray<TaskSeed>) {
    if (seed.dependsOn) {
      Obj.update(tasks[seed.key as TaskKey], (task) => {
        task.dependsOn = seed.dependsOn!.map((key) => Ref.make(tasks[key as TaskKey]));
      });
    }
  }

  return {
    taskSets: Object.fromEntries(entries) as Record<ProjectKey, TaskSet.TaskSet>,
    tasks,
  } satisfies TasksResult;
});

export const PROJECT_NAMES: Record<ProjectKey, string> = {
  cache: 'Cairn 1.8: remote cache v2',
  billing: 'Usage-based billing on Stripe',
  soc2: 'SOC 2 Type I readiness',
  offsite: 'Q4 offsite',
};
