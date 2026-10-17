//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import type * as Project from '@dxos/compute/Project';
import { Database, EID, type Obj } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Event, type Message, type Organization, type Person, type Task, type TaskSet } from '@dxos/types';

import { type People } from '../team/index.ts';
import { type Drawings } from './drawings.ts';
import { type Sheets } from './sheets.ts';

/** What the documents link from inbox-crm, when the template includes it. */
export type InboxCrmLinks = {
  readonly orgs: Readonly<
    Record<
      'github' | 'stripe' | 'cloudflare' | 'northpine' | 'meridian' | 'okapi' | 'brightwater',
      Organization.Organization
    >
  >;
  readonly people: Readonly<
    Record<
      | 'dana'
      | 'elena'
      | 'sofia'
      | 'ines'
      | 'grace'
      | 'marcus'
      | 'ruth'
      | 'aisha'
      | 'ted'
      | 'kenji'
      | 'nadia'
      | 'sam'
      | 'leo'
      | 'mila',
      Person.Person
    >
  >;
  readonly threads: Readonly<Record<'okapiIncident', ReadonlyArray<Message.Message>>>;
  readonly events: Readonly<Record<'teamSync', ReadonlyArray<Event.Event>>>;
};

/** What the documents link from projects, when the template includes it. */
export type ProjectsLinks = {
  readonly projects: Readonly<Record<'cache' | 'billing' | 'soc2' | 'offsite', Project.Project>>;
  readonly taskSets: Readonly<Record<'cache', TaskSet.TaskSet>>;
  readonly tasks: Readonly<Record<string, Task.Task>>;
  readonly artifacts: Readonly<Record<'cacheDesign' | 'billingPlan', Markdown.Document>>;
};

/** What the documents link from the Architecture partial, when the template includes it. */
export type ArchitectureLinks = {
  readonly drawings: ReadonlyMap<string, Drawing.Drawing>;
  readonly docs: Readonly<Record<'composer' | 'edge', Markdown.Document>>;
};

export type CustomerKey = 'northpine' | 'meridian' | 'okapi' | 'brightwater';

export type DocKey =
  | 'handbook'
  | 'onboarding'
  | 'runbook'
  | 'architecture'
  | 'decisions'
  | 'roadmap'
  | 'hiring'
  | 'pricing'
  | 'vendors'
  | 'postmortem'
  | 'syncNotes'
  | `customer.${CustomerKey}`;

export type DocumentsInput = {
  readonly people: People;
  readonly sheets: Sheets;
  readonly drawings: Drawings;
  readonly inboxCrm?: InboxCrmLinks;
  readonly projects?: ProjectsLinks;
  readonly architecture?: ArchitectureLinks;
};

// Space-relative, as the editor writes them; a feed item resolves by id the same way.
const link = (label: string, object: Obj.Unknown) => `[${label}](${EID.make({ entityId: object.id })})`;
const embed = (label: string, object: Obj.Unknown) => `![${label}](${EID.make({ entityId: object.id })})`;

const firstName = (person: Person.Person) => (person.fullName ?? '').split(' ')[0];
const who = (person: Person.Person) => link(person.fullName ?? '', person);
const first = (person: Person.Person) => link(firstName(person), person);

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });

/** Joins lines, dropping `false` and `undefined` so optional content stays inline with the rest. */
const md = (...lines: Array<string | false | undefined>) =>
  lines
    .filter((line): line is string => typeof line === 'string')
    .join('\n')
    .trimEnd();

const FENCE = '```';

/** The documents, built in link order: a document links only documents made before it. */
export const makeDocuments = Effect.fnUntraced(function* ({
  people: p,
  sheets,
  drawings,
  inboxCrm: crm,
  projects,
  architecture: arch,
}: DocumentsInput) {
  const clock = yield* SampleSpace.Clock;
  const docs: Record<string, Markdown.Document> = {};
  const doc = (key: DocKey, name: string, content: string) => {
    const document = Markdown.make({ name, content });
    docs[key] = document;
    return document;
  };
  const quarter = `Q${Math.floor(clock.now.getUTCMonth() / 3) + 1}`;
  const pluginAnatomy = arch?.drawings.get('composer-plugin');
  const edgeCompute = arch?.drawings.get('edge-compute');

  const architecture = doc(
    'architecture',
    'Cairn architecture',
    md(
      '# Cairn architecture',
      '',
      `Cairn stores build outputs under a hash of their inputs, so a CI runner that has seen an action before downloads the result instead of rebuilding it. ${who(p.omar)} owns the index and the key format; ${who(p.felix)} owns storage.`,
      '',
      embed('Cairn architecture', drawings.architectureDiagram),
      '',
      '## Components',
      '',
      '- **Cairn CLI** runs in CI and on laptops. It computes the action key: SHA-256 over the command line, the digest of every input file, the declared environment and the toolchain fingerprint. Since CLI 1.7.3 the toolchain variables (`CC`, `CXX`, `RUSTC`) are always in the key.',
      '- **Edge gateway**, Cloudflare Workers in front of everything. It checks the API token against Auth, asks the index, and presigns R2 URLs so blob bytes never pass through a worker.',
      '- **Index service** maps an action key to a content digest, a size and an org. Postgres, reached from the edge through Hyperdrive. A commit is a compare-and-set on the digest: a second, different digest for a key is rejected.',
      '- **Blob store**: R2 holds hot blobs and serves them without egress fees. S3 is the origin and keeps every blob; R2 refills from it on a miss.',
      '- **Usage meter** counts GB-months stored and GB served per org and reports them to Stripe every hour.',
      '- **Dashboard**, a Composer plugin: tokens, usage, hit rates per repository.',
      '',
      '## A cache lookup',
      '',
      embed('Cache request flow', drawings.requestFlow),
      '',
      `${FENCE}mermaid`,
      'sequenceDiagram',
      '  participant CLI as Cairn CLI',
      '  participant Edge as Edge worker',
      '  participant Index as Index service',
      '  participant R2',
      '  CLI->>CLI: hash inputs into the action key',
      '  CLI->>Edge: GET /v2/cache/:key (token)',
      '  Edge->>Index: lookup(org, key)',
      '  alt hit',
      '    Index-->>Edge: digest, size',
      '    Edge-->>CLI: 302 to a presigned R2 URL',
      '    CLI->>R2: GET blob',
      '    R2-->>CLI: bytes',
      '    CLI->>CLI: verify digest, restore outputs',
      '  else miss',
      '    Index-->>Edge: not found',
      '    Edge-->>CLI: 404 with a presigned PUT URL',
      '    CLI->>CLI: build locally',
      '    CLI->>R2: PUT blob',
      '    CLI->>Edge: commit(key, digest)',
      '    Edge->>Index: compare-and-set',
      '  end',
      FENCE,
      '',
      '## Limits',
      '',
      '- Largest blob 5 GB; anything over 100 MB goes up as a multipart upload.',
      '- Index lookup p99 is 12 ms. A 50 MB hit is served in 180 ms at p99 from the nearest R2 location.',
      '- Keys expire 30 days after their last read. The blob stays in S3 for another 30.',
      '',
      '## Cairn on DXOS',
      '',
      "The cache path above runs on Cairn's own services on Cloudflare. The dashboard and the agents run on DXOS. The edge gateway is Cairn's own worker, not DXOS EDGE.",
      '',
      '### The dashboard is a Composer plugin',
      '',
      `The dashboard ships as a Composer plugin, so tokens, usage and hit rates open in the same workspace as the team's docs, projects and mail. The plugin reads them from the edge gateway with an API token, as the CLI does.${arch ? ` ${link('Composer', arch.docs.composer)} covers how Composer loads plugins and what one contributes.` : ''}`,
      pluginAnatomy && '',
      pluginAnatomy && embed('Plugin Anatomy', pluginAnatomy),
      '',
      '### The agents run on EDGE compute',
      '',
      `Builder, Reviewer, Triage and Scribe run as functions on EDGE's compute service, which hands each run the space's data and an AI service. Every session's chat and trace are DXOS objects in this space, so a task's Gantt bar and the trace behind it come from what the agent wrote.${arch ? ` ${link('EDGE', arch.docs.edge)} describes the services they run on.` : ''}`,
      edgeCompute && '',
      edgeCompute && embed('compute-service', edgeCompute),
    ),
  );

  const incidentMessage = crm?.threads.okapiIncident[0];
  const collisionTask = projects?.tasks.cacheKeyCollision;
  const postmortem = doc(
    'postmortem',
    'Okapi cache-corruption postmortem',
    md(
      '# Okapi cache-corruption postmortem',
      '',
      `**Status:** closed · **Severity:** SEV1 · **Authors:** ${who(p.omar)}, ${who(p.anika)} · **Incident commander:** ${who(p.astrid)}`,
      '',
      crm &&
        `**Customer:** ${link('Okapi Payments', crm.orgs.okapi)}. ${who(crm.people.sam)} reported it; ${who(crm.people.nadia)} ran Okapi's side.`,
      crm && '',
      '## Summary',
      '',
      `On ${day(clock.daysAgo(35))} Cairn served Okapi's CI 214 artifacts whose bytes did not match their keys. Two runners built the same action with different compilers. The CLI left the compiler variable out of the action key, so both computed the same key and both uploaded. The index kept the second digest while R2 kept the first upload's bytes. Okapi verifies digests on restore, so their build failed loudly instead of shipping a wrong binary. Nothing reached their production.`,
      '',
      'Mitigated in 4 hours. Closed in 10 days, after the fleet audit and the CLI fix.',
      '',
      '## Timeline',
      '',
      embed('Okapi incident timeline', sheets.incidentTimeline),
      '',
      incidentMessage && 'The first message in the thread:',
      incidentMessage && '',
      incidentMessage && embed('First report', incidentMessage),
      incidentMessage && '',
      '## Root cause',
      '',
      `The key covered declared inputs only. Okapi's runners had two images, one with clang 16 and one with clang 17, and \`CC\` was not declared. Two writers then raced on one key: the index commit was last-writer-wins, and the blob path was derived from the key rather than the digest, so the second upload's commit pointed at the first upload's bytes. See the lookup and commit path in ${link('Cairn architecture', architecture)}.`,
      '',
      '## What went well',
      '',
      "- Okapi's restore-time verification caught it before anything shipped.",
      `- The read-only switch ${first(p.anika)} added after the spring outage stopped new writes in under 30 minutes.`,
      '',
      '## What went badly',
      '',
      '- Our own CLI did not verify digests on restore by default. It does now.',
      '- Nobody owned the customer update for the first 40 minutes.',
      '',
      '## Action items',
      '',
      `- [x] Toolchain variables always in the action key, CLI 1.7.3 · ${first(p.omar)}`,
      `- [x] Index commit is compare-and-set on the digest · ${first(p.omar)}`,
      `- [x] Digest verification on restore, on by default · ${first(p.felix)}`,
      `- [x] Concurrent-writer regression test in CI · ${first(p.felix)}`,
      `- [x] Status-page owner named in the runbook · ${first(p.anika)}`,
      collisionTask
        ? `- [ ] Blob paths derived from the digest, not the key: ${link('Fix cache-key collision on concurrent writes', collisionTask)} · ${first(p.omar)}`
        : `- [ ] Blob paths derived from the digest, not the key, in Cairn 1.8 · ${first(p.omar)}`,
    ),
  );

  const runbook = doc(
    'runbook',
    'On-call runbook',
    md(
      '# On-call runbook',
      '',
      `Primary on-call rotates weekly; the handoff is Friday 15:00 UTC. ${who(p.anika)} owns the rotation. ${who(p.omar)} is secondary this quarter. Anything SEV1 pages ${who(p.astrid)}, who takes incident command.`,
      '',
      embed('On-call escalation', drawings.escalation),
      '',
      '## Severity',
      '',
      '- **SEV1**: wrong bytes served to anyone, or the cache down for more than one org.',
      '- **SEV2**: edge p99 over 2 s, or hit rate down 20 points, for 10 minutes.',
      '- **SEV3**: one org degraded and a workaround exists.',
      '',
      '## The first 15 minutes',
      '',
      '1. Ack the alert in PostHog. An unacked page goes to the secondary after 15 minutes.',
      '2. Check three graphs: edge 5xx, index lookup latency, R2 error rate.',
      `3. If bytes might be wrong, make the org read-only: \`cairn-admin org set-mode <org> read-only\`. That switch is what contained the ${link('Okapi incident', postmortem)}.`,
      '4. Open an incident channel and post status every 30 minutes, even when nothing changed.',
      `5. Customer-facing: ${first(p.lucia)} updates the status page and emails affected admins.`,
      '',
      '## Vendors',
      '',
      `- ${crm ? link('Cloudflare', crm.orgs.cloudflare) : 'Cloudflare'}: Workers for the edge, R2, Hyperdrive to the Postgres index, and the cache-node fleet. Enterprise support line is in 1Password under "Cloudflare support".`,
      '',
      '## Cost',
      '',
      'A cost spike is an incident. PostHog alerts when the daily Cloudflare bill runs 30% over the forecast below.',
      '',
      embed('Cloud cost forecast', sheets.cloudCost),
    ),
  );

  const vendors = doc(
    'vendors',
    'Vendors and spend',
    md(
      '# Vendors and spend',
      '',
      `${who(p.anika)} owns the Cloudflare account and the monthly cost review. ${who(p.june)} owns Stripe. ${who(p.kofi)} runs the GitHub partnership. Spend is in USD.`,
      '',
      embed('Vendor spend', sheets.vendorSpend),
      '',
      '## Vendors',
      '',
      `- **${crm ? link('GitHub', crm.orgs.github) : 'GitHub'}**: the org plan and Actions minutes.${crm ? ` Partner contact: ${who(crm.people.sofia)}.` : ''}`,
      `- **${crm ? link('Stripe', crm.orgs.stripe) : 'Stripe'}**: payments and, from this quarter, metered billing. Fees grow with revenue.${crm ? ` Account executive: ${who(crm.people.dana)}.` : ''}`,
      `- **${crm ? link('Cloudflare', crm.orgs.cloudflare) : 'Cloudflare'}**: Workers, R2, the cache-node fleet and Hyperdrive to the index. The biggest line by far.${crm ? ` Account executive: ${who(crm.people.ines)}. Solutions architect: ${who(crm.people.elena)}.` : ''}`,
      '',
      '## The R2 move',
      '',
      'Three months ago hot blobs moved from S3 to R2. S3 costs dropped by $1,300 a month, almost all of it egress, and R2 added $1,180. Hit traffic grows 8% a month, so the gap widens.',
      '',
      '## Forecast',
      '',
      embed('Cloud cost forecast', sheets.cloudCost),
      '',
      `Growth rates are the inputs in column G; change them and the forecast follows. A day 30% over forecast pages on-call, per the ${link('runbook', runbook)}.`,
    ),
  );

  const pricing = doc(
    'pricing',
    'Pricing and plans',
    md(
      '# Pricing and plans',
      '',
      `${who(p.lucia)} owns the price list; ${who(p.june)} owns metering and invoicing. Storage is billed as GB-months of blobs held; egress is free.`,
      '',
      embed('Cairn plans', sheets.pricing),
      '',
      "The monthly price column is base plus overage on typical usage, so the sheet doubles as a quote calculator: change a tier's typical GB and read the price.",
      '',
      '## Why usage-based',
      '',
      `Seat pricing charged a 40-person web team with a 30 GB cache more than a 6-person game studio with 3 TB of assets. Storage is what costs us money, as the ${link('vendor spend', vendors)} shows, so storage is what we charge for.`,
      '',
      (crm || projects) &&
        [
          crm &&
            `Usage records go to ${link('Stripe', crm.orgs.stripe)} hourly from the usage meter; Stripe prices them and issues the invoice.`,
          projects && `The cutover is planned in ${link('Billing migration plan', projects.artifacts.billingPlan)}.`,
        ]
          .filter(Boolean)
          .join(' '),
      (crm || projects) && '',
      '## Tiers',
      '',
      '- **Free**: 10 GB, hard cap, no overage. Enough for one mid-sized repo.',
      '- **Team**: $99 with 250 GB, then $0.08 per GB.',
      '- **Business**: $499 with 2 TB, then $0.06 per GB. SSO.',
      '- **Enterprise**: annual contract from $2,400 a month with 15 TB, $0.04 per GB over. SSO, audit log, the SOC 2 report, a named engineer.',
      '',
      '## Open questions',
      '',
      '- Charge separately for egress above 10× storage? Only Brightwater-sized game repos hit it.',
      '- Grandfather current Team customers at seat pricing for one renewal, or move everyone at once?',
    ),
  );

  const hiring = doc(
    'hiring',
    'Hiring plan',
    md(
      '# Hiring plan',
      '',
      `${who(p.astrid)} owns engineering hiring. ${who(p.lucia)} owns the solutions engineer and developer advocate roles. Five roles are open; the budget covers three hires this year and two more in Q1 if usage billing lands.`,
      '',
      embed('Open roles', sheets.hiring),
      '',
      '## Order',
      '',
      `1. **SRE.** ${first(p.anika)} is the only person who knows the stack end to end on call, and the ${link('Okapi incident', postmortem)} ran on her and Omar for four hours straight.`,
      '2. **Senior backend, cache engine.** Cairn 1.8 and the index rewrite after it need a second senior next to Omar.',
      '3. **Solutions engineer.** Enterprise trials now take 6 weeks of engineering time each.',
      '4. **Frontend** and **developer advocate** after that.',
      '',
      '## The loop',
      '',
      '- 30-minute screen with the hiring manager.',
      '- Take-home (4 hours, paid) or a 90-minute pairing session; the candidate picks.',
      `- Onsite, remote: cache system design with ${first(p.omar)}, code review with ${first(p.felix)}, an on-call scenario with ${first(p.anika)}, values with Astrid.`,
      '- Decision within two working days of the onsite.',
    ),
  );

  const syncs: Array<{ start: string; event?: Event.Event }> = crm
    ? crm.events.teamSync
        .filter((event) => new Date(event.startDate) < clock.now)
        .slice(-4)
        .map((event) => ({ start: event.startDate, event }))
    : (() => {
        const sinceMonday = (clock.now.getUTCDay() + 6) % 7;
        return [21, 14, 7, 0].map((weeks) => ({ start: clock.daysAgo(sinceMonday + weeks, 10) }));
      })();
  const [fourth, third, second, last] = syncs;
  const syncSection = (sync: (typeof syncs)[number] | undefined, body: string[]) =>
    sync ? [`## ${day(sync.start)}`, '', ...(sync.event ? [embed('Team sync', sync.event), ''] : []), ...body, ''] : [];
  const syncNotes = doc(
    'syncNotes',
    'Team sync notes',
    md(
      '# Team sync notes',
      '',
      'Monday 10:00 UTC, everyone. Newest first. Each action item names its owner.',
      '',
      ...syncSection(last, [
        "Cairn 1.8 goes out Friday if the release candidate holds through the weekend. Meridian's security review went well; they want the SOC 2 letter before signing. Offsite agenda is half done.",
        '',
        `- Cut the 1.8 release candidate and freeze the index schema · ${first(p.omar)}`,
        `- Release post and changelog for 1.8 · ${first(p.kofi)}`,
        `- Prep the Brightwater intro call: pricing for 3 TB of game assets · ${first(p.lucia)}`,
      ]),
      ...syncSection(second, [
        "Hana's first full week. Shadow metering is 3% below what Stripe computes from the same usage, all on orgs with blobs deleted mid-hour.",
        '',
        `- Reconcile shadow metering against Stripe before invoices go live · ${first(p.june)}`,
        `- Rotate the R2 access keys the edge workers use · ${first(p.anika)}`,
        `- First index pull request, reviewed by Omar · ${first(p.hana)}`,
      ]),
      ...syncSection(third, [
        'Hana starts Wednesday. S3 still holds every blob forever, which is a third of the storage bill.',
        '',
        `- Accounts and laptop for Hana, buddy is Omar · ${first(p.astrid)}`,
        `- S3 lifecycle rule: delete blobs 30 days after their key expires · ${first(p.felix)}`,
        `- Designs for the usage page in the dashboard · ${first(p.ben)}`,
      ]),
      ...syncSection(fourth, [
        `The Okapi postmortem is closed; every action item but the blob-path change is done. SOC 2 work starts this week.`,
        '',
        `- Shortlist three SOC 2 auditors · ${first(p.lucia)}`,
        `- Status-page component in the dashboard so incidents show where customers look · ${first(p.tomas)}`,
        `- Write up the blob-path change for Cairn 1.8 · ${first(p.omar)}`,
      ]),
    ),
  );

  const roadmap = doc(
    'roadmap',
    `${quarter} roadmap`,
    md(
      `# ${quarter} roadmap`,
      '',
      `${who(p.lucia)} owns the roadmap; ${who(p.astrid)} signs off on dates. Four bets this quarter, one lane each.`,
      '',
      embed('Roadmap timeline', drawings.roadmap),
      '',
      `## ${projects ? link('Cairn 1.8: remote cache v2', projects.projects.cache) : 'Cairn 1.8: remote cache v2'}`,
      '',
      `Ships ${day(clock.daysFromNow(2))}. Blob paths derived from the digest, compare-and-set commits, digest verification on by default. Closes the last action item from the ${link('Okapi postmortem', postmortem)}.`,
      '',
      projects && embed('Cairn 1.8 tasks', projects.taskSets.cache),
      projects && '',
      `## ${projects ? link('Usage-based billing on Stripe', projects.projects.billing) : 'Usage-based billing on Stripe'}`,
      '',
      `Shadow metering now, real invoices next month. Tiers and prices are in ${link('Pricing and plans', pricing)}.`,
      '',
      `## ${projects ? link('SOC 2 Type I', projects.projects.soc2) : 'SOC 2 Type I'}`,
      '',
      'Policies and controls this quarter, the audit at the turn of the quarter. Meridian and every other enterprise deal waits on it.',
      '',
      `## ${projects ? link('Offsite', projects.projects.offsite) : 'Offsite'}`,
      '',
      `Three days at Saltmarsh Lodge from ${day(clock.daysFromNow(38))}. The agenda is next year's plan.`,
      '',
      '## Not this quarter',
      '',
      `- Self-hosted Cairn. Two prospects asked; neither would pay for it yet.`,
      `- A second senior on the cache engine depends on the ${link('hiring plan', hiring)}.`,
    ),
  );

  const decisionEntries: Array<{
    days: number;
    title: string;
    deciders: Person.Person[];
    changed: Markdown.Document[];
    context: string;
    decision: string;
    alternatives: string[];
    consequences: string;
  }> = [
    {
      days: 120,
      title: 'Postgres stays the index store',
      deciders: [p.omar, p.june, p.astrid],
      changed: [architecture],
      context:
        'The index maps every action key to a blob digest: 2 billion rows, 30,000 lookups a second at peak. Load tests put the current Postgres primary at 40× that peak before latency moves.',
      decision: 'Keep the index on Postgres, partitioned by tenant, with one read replica per region.',
      alternatives: [
        'FoundationDB: scales further, but nobody on the team has run it in production.',
        'A managed key-value store: no operations, but every lookup becomes a billed request and ties the index to one vendor.',
      ],
      consequences:
        'Three of us can operate the index today. We revisit at 10× the current peak, or if one tenant passes a quarter of all rows.',
    },
    {
      days: 98,
      title: 'Hot blobs move from S3 to R2',
      deciders: [p.felix, p.anika, p.astrid],
      changed: [architecture, vendors],
      context:
        'Egress was 60% of the storage bill: CI runners in other clouds pulled the same hot blobs thousands of times a day.',
      decision:
        'Blobs read in the last 30 days are served from R2, which has no egress fees. S3 stays the origin, so nothing lives only in R2.',
      alternatives: [
        'A CDN in front of S3: cuts egress by about half and adds a second CDN bill.',
        'Move everything to R2: loses S3 lifecycle rules and the EU bucket enterprise trials ask for.',
      ],
      consequences:
        'Two storage tiers to keep consistent, and a backfill job that copies on first read. S3 egress falls by about 90% at current traffic.',
    },
    {
      days: 82,
      title: 'Weekly on-call with a named secondary',
      deciders: [p.anika, p.astrid],
      changed: [runbook],
      context:
        'Pages went to whoever was online in Slack. Two incidents last quarter waited more than an hour for someone to pick them up.',
      decision:
        'One engineer is primary for a week, with a 15-minute acknowledgement window. A named secondary is paged when the primary does not acknowledge.',
      alternatives: [
        'Daily rotation: shorter shifts, but nobody holds context across a multi-day incident.',
        'An outside follow-the-sun service: costs more than an SRE hire and knows nothing about the index.',
      ],
      consequences:
        'Everyone on the cache engine and the API joins the rotation after two shadow shifts. On-call weeks carry no sprint commitments.',
    },
    {
      days: 34,
      title: 'Index commits are compare-and-set on the digest',
      deciders: [p.omar, p.felix, p.anika],
      changed: [architecture, ...(projects ? [projects.artifacts.cacheDesign] : [])],
      context:
        'In the Okapi incident two runners uploaded different bytes under the same key. Last-writer-wins let the index and R2 disagree without any error.',
      decision:
        'An index commit names the digest it expects to replace. A second, different digest for an existing key is rejected, logged and alerted on.',
      alternatives: [
        'Keep last-writer-wins and verify on read: catches the problem only after a runner has downloaded the bytes.',
        'Content-address keys by output digest: right in principle, but it changes the protocol for every client.',
      ],
      consequences:
        'A rejected write now shows up as a cache miss for the second runner, not a silent overwrite. Alerting fires on more than 10 rejections in an hour.',
    },
    {
      days: 33,
      title: 'Toolchain variables are always in the action key',
      deciders: [p.omar, p.felix],
      changed: [postmortem, architecture, ...(projects ? [projects.artifacts.cacheDesign] : [])],
      context:
        'The key covered declared inputs only. Two runners with different compilers computed the same key, which is the root cause in the postmortem.',
      decision:
        'The CLI always hashes the compiler, its version and the target platform into the action key, whether or not the build declares them.',
      alternatives: [
        'Ask teams to declare their toolchain: the declaration was already there to forget.',
        'Hash the whole environment: every runner image update would invalidate the cache.',
      ],
      consequences:
        'About 2% more misses across the fleet in the first week, then back to baseline. Shipped in CLI 1.7.3; older CLIs get a warning and, from 1.8, are refused.',
    },
    {
      days: 28,
      title: 'Charge for storage, not seats',
      deciders: [p.lucia, p.june, p.astrid],
      changed: [pricing],
      context:
        'Seat pricing charged a 5-person team with a huge monorepo the same as 5 people with a tiny one. Storage is what costs us money.',
      decision:
        'Plans are priced by stored gigabytes, with lookups unmetered. The dashboard shows storage per project so customers can see what they pay for.',
      alternatives: [
        'Seats plus a storage overage: two numbers to explain on every sales call.',
        'Per-lookup pricing: punishes the teams that use the cache the most.',
      ],
      consequences:
        'Billing meters storage daily through Stripe. Existing seat customers keep their price for 12 months.',
    },
    {
      days: 21,
      title: 'Free tier is a hard 10 GB cap',
      deciders: [p.lucia, p.astrid],
      changed: [pricing],
      context: 'Free accounts with no card on file grew past 100 GB, and nothing could be billed.',
      decision:
        'Free accounts stop accepting writes at 10 GB and keep serving reads. There is no overage without a card.',
      alternatives: [
        'Evict the least-recently-used blobs: quietly turns hits into misses, and users blame the cache.',
        'A soft cap with email warnings: what we had, and nobody upgraded.',
      ],
      consequences:
        'The CLI prints the cap and an upgrade link when a write is refused. Support expects a short bump in tickets.',
    },
    {
      days: 9,
      title: 'Hire the SRE before the second cache engineer',
      deciders: [p.astrid, p.lucia],
      changed: [hiring],
      context: 'Since the incident Anika has been primary or secondary for half of all on-call weeks.',
      decision: 'The open SRE role is filled first. The second cache-engine role opens once the SRE starts.',
      alternatives: [
        'Hire both at once: the budget covers one until next quarter.',
        'Cache engineer first: it speeds up the index rewrite and leaves the pager as it is.',
      ],
      consequences: 'The pager is the bigger risk to Cairn 1.8. The index rewrite slips about three weeks.',
    },
  ];
  const decisions = doc(
    'decisions',
    'Decision log',
    md(
      '# Decision log',
      '',
      'One entry per decision that changed how Cairn is built or sold, newest last. An entry says why it came up, what was decided and what else was on the table, who decided, and the documents it changed. Reversing a decision is a new entry.',
      '',
      ...decisionEntries.flatMap(
        ({ days, title, deciders, changed, context, decision, alternatives, consequences }) => [
          `## ${day(clock.daysAgo(days))}: ${title}`,
          '',
          `**Deciders:** ${deciders.map(first).join(', ')} · **Changed:** ${changed.map((target) => link(target.name ?? '', target)).join(', ')}`,
          '',
          `**Context.** ${context}`,
          '',
          `**Decision.** ${decision}`,
          '',
          '**Alternatives considered:**',
          '',
          ...alternatives.map((alternative) => `- ${alternative}`),
          '',
          `**Consequences.** ${consequences}`,
          '',
        ],
      ),
    ),
  );

  const onboarding = doc(
    'onboarding',
    'Engineer onboarding',
    md(
      '# Engineer onboarding',
      '',
      `Two weeks from laptop to first merged change. ${who(p.hana)} is the most recent engineer through it; fix this page when something is wrong, it is how the next person finds out.`,
      '',
      '## Week one',
      '',
      `1. Read ${link('Cairn architecture', architecture)} top to bottom, then the ${link('decision log', decisions)} for why it looks that way.`,
      projects &&
        `2. Read ${link('Remote cache v2 design', projects.artifacts.cacheDesign)}; most of what you touch in your first month is in it.`,
      `${projects ? 3 : 2}. Get access: GitHub org and PostHog from ${first(p.astrid)}, Cloudflare Access and the Cloudflare dashboard from ${first(p.anika)}, Stripe test mode from ${first(p.june)}.`,
      `${projects ? 4 : 3}. Point Cairn at its own monorepo. The second \`cairn build\` should be all hits; if it is not, that is your first bug.`,
      `${projects ? 5 : 4}. Pair with ${first(p.felix)} on a storage ticket.`,
      '',
      '## Week two',
      '',
      `- Shadow on-call for one shift and read the ${link('runbook', runbook)}.`,
      `- Ship one change to the index with ${first(p.omar)}'s review. He is your buddy; ask him first.`,
      '',
      embed('Cairn architecture', drawings.architectureDiagram),
      '',
      '## Local setup',
      '',
      `${FENCE}sh`,
      'git clone git@github.com:alien-labs/cairn.git',
      'cd cairn && make dev',
      'cairn --endpoint http://localhost:8787 build //...',
      FENCE,
      '',
      '`make dev` starts the index against a local Postgres and the edge worker in Miniflare. R2 is faked by MinIO.',
    ),
  );

  const roles: Array<[Person.Person, string]> = [
    [p.astrid, 'Engineering manager. Hiring, planning, incident command. Everyone reports to her.'],
    [p.omar, 'Staff engineer, cache engine. The index and the key format.'],
    [p.felix, 'Cache engine. Storage tiering across R2 and S3.'],
    [p.june, 'API and billing. The public API and Stripe metering.'],
    [p.tomas, 'Frontend. The dashboard.'],
    [p.anika, 'SRE. The on-call rotation, the Cloudflare account, cost.'],
    [p.ben, 'Product design. The dashboard and what the CLI prints.'],
    [p.lucia, 'Product. Roadmap, pricing, customer calls.'],
    [p.kofi, 'Developer relations. Docs, the GitHub Actions integration, the community forum.'],
    [p.hana, 'Software engineer on the cache engine, newest on the team.'],
  ];
  doc(
    'handbook',
    'Alien Labs handbook',
    md(
      '# Alien Labs handbook',
      '',
      'Alien Labs builds Cairn, a hosted build cache for monorepos. Ten people in Lisbon and Toronto. The shared hours are 14:00 to 17:00 UTC, and meetings stay inside them.',
      '',
      embed('Org chart', drawings.orgChart),
      '',
      '## Who does what',
      '',
      ...roles.map(([person, role]) => `- ${who(person)}: ${role}`),
      '',
      '## How we work',
      '',
      `- Write it down. Decisions go in the ${link('decision log', decisions)}; anything a new engineer asks twice goes in ${link('onboarding', onboarding)}.`,
      `- Team sync is Monday 10:00 UTC. Notes and action items are in ${link('Team sync notes', syncNotes)}.`,
      `- On-call is weekly with a Friday handoff. Everyone in engineering is on it after their second month. Read the ${link('runbook', runbook)}.`,
      `- What we are building this quarter is the ${link(`${quarter} roadmap`, roadmap)}.`,
      '- Time off: put it on the calendar and tell Astrid two weeks ahead. Under five days needs no approval.',
      '- Expenses under $200 need no approval; file the receipt within the month.',
    ),
  );

  if (crm) {
    const customer = (key: CustomerKey, name: string, content: string) => doc(`customer.${key}`, name, content);
    customer(
      'northpine',
      'Northpine Robotics',
      md(
        '# Northpine Robotics',
        '',
        `${link('Northpine Robotics', crm.orgs.northpine)} is the largest customer: 140 seats on Business, a Bazel monorepo of robot firmware and simulation. Renewal is due next month. ${who(crm.people.grace)} (VP Engineering) signs; ${who(crm.people.marcus)} (platform lead) runs Cairn day to day; ${who(crm.people.ruth)} handles procurement.`,
        '',
        '## Open asks',
        '',
        `- SSO through Okta for all 140 seats before renewal. ${first(p.june)} is on it.`,
        '- Usage broken down per team in the dashboard, so Grace can charge it back.',
        `- Renewal at 180 seats if the move to ${link('usage pricing', pricing)} does not raise their bill more than 10%.`,
        '',
        '## Notes',
        '',
        `- Hit rate 91% on main, 64% on pull requests. Marcus thinks the gap is simulation assets; ${first(p.omar)} offered to look.`,
      ),
    );
    customer(
      'meridian',
      'Meridian Health Data',
      md(
        '# Meridian Health Data',
        '',
        `${link('Meridian Health Data', crm.orgs.meridian)} is on an enterprise trial with 60 engineers. The deal is blocked on the security review. ${who(crm.people.aisha)} (head of platform) wants it; ${who(crm.people.ted)} ran the questionnaire; ${who(crm.people.kenji)} (compliance) has the final say.`,
        '',
        '## Open asks',
        '',
        projects
          ? `- A SOC 2 Type I report. Tracked in ${link('SOC 2 Type I readiness', projects.projects.soc2)}.`
          : '- A SOC 2 Type I report.',
        '- Blobs kept in the EU only. R2 jurisdiction restrictions cover it; S3 needs a second bucket in the EU.',
        '- Customer-managed encryption keys. Not before next year.',
        '',
        '## Notes',
        '',
        `- The questionnaire is answered; ${first(p.anika)} wrote the infrastructure half.`,
      ),
    );
    customer(
      'okapi',
      'Okapi Payments',
      md(
        '# Okapi Payments',
        '',
        `${link('Okapi Payments', crm.orgs.okapi)}: Team plan, 35 engineers, a Rust and Go monorepo for card processing. Hit by cache corruption five weeks ago; the ${link('postmortem', postmortem)} is shared with them. ${who(crm.people.nadia)} (engineering director) owns the relationship; ${who(crm.people.sam)} found the bug.`,
        '',
        '## Open asks',
        '',
        '- A service credit for the incident month. Astrid offered 100%; Nadia accepted.',
        '- A webhook when Cairn rejects a conflicting commit, so their CI can flag a non-hermetic action.',
        '- Confirmation that digest verification on restore stays on by default.',
      ),
    );
    customer(
      'brightwater',
      'Brightwater Games',
      md(
        '# Brightwater Games',
        '',
        `${link('Brightwater Games', crm.orgs.brightwater)} came in as a lead from the GitHub Actions marketplace. Unreal Engine monorepo with about 3 TB of cooked assets. ${who(crm.people.leo)} (CTO) and ${who(crm.people.mila)} (engineering manager) are on the intro call.`,
        '',
        '## Open asks',
        '',
        `- A price for 3 TB on Business. The ${link('pricing sheet', pricing)} says $559 a month at that size.`,
        '- Perforce support. Cairn keys on file digests, so it works, but nobody has tried it.',
        `- A demo on their own repo. ${first(p.kofi)} will set one up after the call.`,
      ),
    );
  }

  for (const document of Object.values(docs)) {
    yield* Database.add(document);
  }
  return docs;
});
