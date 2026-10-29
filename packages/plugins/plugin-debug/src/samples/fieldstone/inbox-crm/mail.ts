//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Blob, Database, Obj, Ref } from '@dxos/echo';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';
import { type Actor, Message, type Person } from '@dxos/types';

import { type Agents, type PersonKey } from '../team/index.ts';
import { type Make, personActor } from '../util.ts';
import { type ContactKey, EXTRACTED } from './contacts.ts';
import { MESSAGE_SUMMARIES, messageSummaryKey } from './message-summaries.ts';
import { type Clock, address, at, isWeekday, makeRandom, textBlock, threadIdFor } from './util.ts';

export type ThreadKey =
  | 'northpineSso'
  | 'northpineRenewal'
  | 'meridianSecurity'
  | 'okapiIncident'
  | 'brightwaterIntro'
  | 'halcyonInbound'
  | 'kestrelInbound'
  | 'vantageDiscovery'
  | 'vantageResidency'
  | 'meridianProposal'
  | 'tidewaterSecurity'
  | 'tidewaterMsa'
  | 'lumenSigned'
  | 'lumenRollout'
  | 'pallasDecision'
  | 'corvidEvaluation'
  | 'larkspurDemo'
  | 'aldermoorProposal'
  | 'stripeBilling'
  | 'cloudflareCredits'
  | 'cloudflareR2'
  | 'githubPartner'
  | 'offsite'
  | 'hanaOnboarding'
  | 'releaseNotes'
  | 'weeklyUpdate';

export type Threads = Record<ThreadKey, Message.Message[]>;

type Who = PersonKey | ContactKey;

export type Directory = Record<Who, Person.Person>;

type Mail = {
  readonly from: Who | 'scribe';
  readonly to: ReadonlyArray<Who | 'scribe'>;
  readonly cc?: ReadonlyArray<Who>;
  /** Days before the reference date. */
  readonly day: number;
  readonly time: readonly [hour: number, minute: number];
  readonly body: string;
  readonly starred?: boolean;
  readonly attachment?: { readonly name: string; readonly type: string; readonly text: string };
};

type Thread = {
  readonly key?: ThreadKey;
  readonly subject: string;
  readonly customer?: boolean;
  readonly archived?: boolean;
  readonly mail: ReadonlyArray<Mail>;
};

const QUESTIONNAIRE = `Section,Question,Answer
1. Company,Legal entity and country of incorporation,
1. Company,Do you hold a current SOC 2 Type II report?,
2. Data,What customer data does the service store?,
2. Data,Can protected health information (PHI) reach your systems?,
2. Data,Are environment variables or secrets ever transmitted or logged?,
3. Hosting,Where is customer data hosted? List regions.,
3. Hosting,Is data encrypted at rest? Which algorithm and key management?,
4. Access,Which employees can access customer data and how is access granted?,
4. Access,Is privileged access logged and reviewed?,
5. Incidents,Describe your incident response process and customer notification window.,
6. Continuity,What are your RPO and RTO for customer data?,
`;

//
// Named threads.
//

const CUSTOMER_THREADS: Thread[] = [
  {
    key: 'northpineSso',
    subject: 'Northpine SSO rollout',
    customer: true,
    mail: [
      {
        from: 'grace',
        to: ['astrid'],
        cc: ['marcus'],
        day: 44,
        time: [19, 10],
        body: `Hi Astrid,

Our security team has set a deadline: every vendor with access to source or build output moves behind Okta by end of quarter, with provisioning and offboarding driven from Okta rather than by hand. Cairn is on the list, and since most of our engineers touch it every day it's one of the first we want done.

Marcus runs our platform team and will own this on our side. He did the same migration for our artifact registry and CI provider this summer, so he knows where the sharp edges are.

Can you support SAML with SCIM provisioning, or only SAML? If SCIM isn't available we'd need a documented offboarding process our auditors can test. We'd like to kick off in the next couple of weeks.

Grace`,
      },
      {
        from: 'astrid',
        to: ['grace'],
        cc: ['marcus', 'june'],
        day: 43,
        time: [8, 25],
        body: `> Can you support SAML with SCIM provisioning, or only SAML?

Hi Grace, Marcus,

Both. SAML has been generally available since 1.6 and works with Okta out of the box. SCIM is in beta: users and groups sync from Okta, and seat assignment can follow group membership. June built it and has been running it with two other customers for about a month, so I've added her here. She'll be your main contact on our side.

Offboarding is where SCIM earns its keep, so I'd test that path early in staging rather than at the end.

Kickoff this Friday? I'll send an invite for the afternoon your time, and June will bring the staging values.

Astrid`,
      },
      {
        from: 'marcus',
        to: ['astrid', 'june'],
        cc: ['grace'],
        day: 41,
        time: [16, 5],
        body: `Astrid, June,

A few things before Friday, so we can use the call for decisions rather than setup:

- We'll need the ACS URL and entity ID for staging first, then prod. Our change process wants staging signed off by two admins before a prod app exists.
- Our IdP admins want to know whether you support IdP-initiated login. We block it by policy, so the Okta tile has to start an SP-initiated flow.
- We'd like groups pushed over SCIM, not only users. Seat assignment by group is how we keep the bill predictable.

I'll have a test tenant with a dozen users ready by Thursday.

Marcus Bell
Platform Lead, Northpine Robotics`,
      },
      {
        from: 'june',
        to: ['marcus'],
        cc: ['astrid', 'grace'],
        day: 37,
        time: [14, 30],
        body: `Hi Marcus,

Staging values:
ACS URL: https://staging.cairn.dev/sso/saml/acs
Entity ID: cairn-staging

We're SP-initiated only by default, so your policy is fine. For the Okta tile, set the app's initiate-login URL to https://staging.cairn.dev/sso/login?org=northpine and the flow starts on our side.

Group push works over SCIM. Each pushed group shows up in Cairn as a team, and you can map a team to a seat pool in the admin console. The SCIM base URL and token are under Settings > Provisioning. The token is shown once, so store it before you close the dialog.

Prod values follow once your admins sign off on staging.

June`,
      },
      {
        from: 'marcus',
        to: ['june'],
        cc: ['astrid', 'grace'],
        day: 34,
        time: [15, 50],
        body: `June,

Staging works end to end with our test tenant: login, user push, group push and seat assignment. Two issues:

1. Group claims arrive as display names, not IDs. We rename groups often enough that mappings would break within a month.
2. Deactivating a user in Okta removes them from the Cairn UI but leaves their API tokens active. I deactivated a test user and their token was still pulling artifacts an hour later.

The second one blocks prod for us. Our policy is that a deactivated account loses every credential within 15 minutes, and the auditors test it every quarter.

Marcus`,
      },
      {
        from: 'june',
        to: ['marcus'],
        cc: ['astrid', 'grace'],
        day: 30,
        time: [13, 15],
        body: `> Deactivating a user in Okta leaves their Cairn API tokens active.

Marcus,

Fixed, and thanks for the clear repro. SCIM deactivation now revokes every API token the user owns and ends their sessions in the same transaction, so the window is however long Okta takes to send the request, usually under a minute. Each revocation shows up in the audit log with the SCIM request ID. It's on staging now and goes to prod with Wednesday's deploy.

For group claims, set the groups attribute to groups.id in your Okta app and we'll map on IDs. Existing mappings carry over, and the admin console shows the display name next to each ID.

Could you rerun your offboarding test on staging before Wednesday?

June`,
      },
      {
        from: 'grace',
        to: ['astrid', 'june'],
        cc: ['marcus'],
        day: 27,
        time: [20, 40],
        body: `Astrid, June,

Prod is live for our first 40 engineers and the rest move over on Monday. Marcus reran the offboarding test against prod this morning and the token was dead within 40 seconds, which the auditors will like.

Thanks to you both for turning the token fix around in under a week.

Grace`,
      },
    ],
  },
  {
    key: 'northpineRenewal',
    subject: 'Northpine renewal and seat count',
    customer: true,
    mail: [
      {
        from: 'ruth',
        to: ['astrid'],
        cc: ['grace'],
        day: 12,
        time: [14, 0],
        body: `Hello Astrid,

Our Cairn agreement renews next month. Grace tells me usage has grown since the SSO rollout, so before we sign I need a quote for 180 seats instead of the current 120, plus pricing for the dedicated cache region you discussed with her.

Please include the term options you offer and any discount for a multi-year commitment. Our standard terms are net-60 payment; if that's a problem, flag it now so legal can review in parallel.

Procurement needs the final quote ten business days before renewal.

Regards,
Ruth Adeyemi
Procurement Manager, Northpine Robotics`,
      },
      {
        from: 'astrid',
        to: ['ruth'],
        cc: ['grace', 'lucia'],
        day: 9,
        time: [9, 10],
        body: `Thanks Ruth. Adding Lucía, who owns pricing and will send the formal quote.

180 seats is fine, and Grace's numbers match ours: weekly active users went from 96 to 151 in the month after SSO. The dedicated region is a separate line item, since it means a cache cluster and storage that serve only Northpine. Lucía will send numbers this week.

Net-60 is fine with us.

Astrid`,
      },
      {
        from: 'lucia',
        to: ['ruth'],
        cc: ['astrid', 'grace'],
        day: 7,
        time: [11, 45],
        body: `Ruth,

180 seats on the annual plan comes to $86,400, which keeps your current rate of $40 a seat per month. A dedicated US region adds $1,500 a month with a 99.95% uptime commitment, plus a one-time setup fee of $5,000.

If you sign for two years we'll hold the seat rate for both years and waive the region setup fee. Seats added mid-term are prorated at the same rate.

Tell me which term you prefer and I'll send the order form the same day.

Lucía`,
      },
      {
        from: 'grace',
        to: ['lucia', 'ruth'],
        cc: ['astrid'],
        day: 6,
        time: [17, 20],
        body: `Lucía,

Two years works for us if the region is live before our Q1 release freeze, which starts the second week of January. Firmware builds are the main reason we want it, and we won't move them once the freeze starts.

Can you commit to that?

Grace`,
      },
      {
        from: 'astrid',
        to: ['grace', 'ruth'],
        cc: ['lucia'],
        day: 2,
        time: [10, 5],
        starred: true,
        body: `> Can you commit to that?

Yes. Anika has the region scheduled for the week after our offsite, well ahead of your freeze. That leaves Marcus's team time to point a staging pipeline at it and compare hit rates before anything important moves.

Lucía will send the two-year order form today, and we'll walk through the cutover plan at the QBR.

Astrid`,
      },
    ],
  },
  {
    key: 'meridianSecurity',
    subject: 'Meridian security questionnaire',
    customer: true,
    mail: [
      {
        from: 'aisha',
        to: ['astrid'],
        cc: ['kenji', 'ted'],
        day: 26,
        time: [15, 30],
        starred: true,
        attachment: { name: 'Meridian vendor security questionnaire.csv', type: 'text/csv', text: QUESTIONNAIRE },
        body: `Astrid,

The platform team is happy with the trial. CI on the pipelines we moved dropped from 34 minutes to 12, and nobody has asked to turn it off. But we can't move to a paid plan until Kenji's team signs off.

Our vendor security questionnaire is attached. It's the one we send every vendor that touches our build systems. Ted will review the technical answers; Kenji owns the decision. Short answers are fine, and Ted will ask if he needs more.

Is three weeks realistic? Our budget for this quarter closes soon after.

Aisha Bello
Head of Platform, Meridian Health Data`,
      },
      {
        from: 'astrid',
        to: ['aisha', 'kenji', 'ted'],
        cc: ['anika'],
        day: 23,
        time: [9, 0],
        body: `Hi Aisha, Kenji, Ted,

Three weeks is fine. Anika runs our infrastructure and will answer the hosting, access and continuity sections; I'll take company, data and incidents. You'll have a first pass within a week.

One question up front, since it changes how much of the questionnaire applies: do you need a BAA from us, or does Cairn stay out of PHI scope? The agent stores build artifacts and their hashes, nothing from your runtime systems, but I'd rather you make that call with the details in front of you.

Astrid`,
      },
      {
        from: 'kenji',
        to: ['astrid'],
        cc: ['aisha', 'ted', 'anika'],
        day: 22,
        time: [18, 15],
        body: `Astrid,

If you can show that no PHI reaches your systems, we classify you as low-risk and skip the BAA. That's the faster path for both of us.

To get there I need two things in writing: exactly what your agent uploads, ideally with an example request, and confirmation that you never log environment variables or command lines. Our engineers sometimes pass credentials through environment variables in CI, and that's the usual way sensitive data leaks into build tooling.

Kenji Moreau
Compliance Officer, Meridian Health Data`,
      },
      {
        from: 'anika',
        to: ['kenji', 'ted'],
        cc: ['astrid', 'aisha'],
        day: 19,
        time: [16, 40],
        body: `Kenji, Ted,

Sections 3 to 6 are filled in. The short version:

- The agent uploads content-addressed build outputs and their hashes. Nothing else. I've added a captured upload request to the sheet as an example.
- Environment variables and command lines are never sent. Request logs keep path, status code and latency only, for 30 days.
- Encryption at rest is AES-256, keys managed in Cloudflare and rotated yearly. TLS 1.2 or later in transit.
- RPO is 24 hours and RTO is 4 hours. Cache contents can be rebuilt from your CI, so losing them costs time, not data.

Astrid is finishing sections 1, 2 and 5.

Anika`,
      },
      {
        from: 'ted',
        to: ['anika'],
        cc: ['astrid', 'kenji'],
        day: 16,
        time: [19, 5],
        body: `Thanks Anika, this is clear. Two follow-ups:

1. Do you have a SOC 2 Type II report, or only Type I?
2. Who at Alien Labs can access customer cache buckets, and is that access logged? I'd like to know how access is granted and how long it lasts, not only who holds it.

Ted Kowalski
Security Engineer, Meridian Health Data`,
      },
      {
        from: 'astrid',
        to: ['ted'],
        cc: ['kenji', 'anika', 'aisha'],
        day: 13,
        time: [8, 50],
        body: `> Do you have a SOC 2 Type II report, or only Type I?

Ted,

Type I for now. Our auditor finishes fieldwork this month and the report is due a few weeks after; I'll send it under NDA as soon as it lands. The Type II observation window starts right after, so expect that report next year.

Bucket access is limited to Anika and Omar, and neither has standing access. Each session is a short-lived role, granted for at most an hour through an approval in our access tool, and every session and API call goes to CloudTrail. We review the log monthly. Nobody else at Alien Labs, me included, can read a customer bucket.

Astrid`,
      },
      {
        from: 'ted',
        to: ['kenji'],
        cc: ['astrid', 'anika', 'aisha'],
        day: 9,
        time: [20, 10],
        body: `Kenji,

Technical review is done. No blockers. Anika's description of the data flow matches what I saw when I captured the agent's traffic in our trial workspace.

I'd like to walk through the access logging live before I sign off: one approval, one session, and the CloudTrail entries it leaves. Astrid, can we use Thursday's review call for that?

Ted`,
      },
      {
        from: 'kenji',
        to: ['ted', 'astrid'],
        cc: ['anika', 'aisha'],
        day: 8,
        time: [14, 25],
        body: `Thursday works. Please bring the SOC 2 report if it has arrived. If not, a letter from your auditor with the expected date is enough for now.

Kenji`,
      },
      {
        from: 'aisha',
        to: ['astrid'],
        cc: ['kenji', 'ted', 'anika'],
        day: 5,
        time: [17, 55],
        body: `Astrid,

Kenji signed off this morning, on the condition that the SOC 2 Type I report reaches us within 60 days. Procurement will send the paid-plan paperwork next week for the 60 engineers on the trial.

Thanks for moving so quickly on Ted's questions. It's the fastest vendor review we've run this year.

Aisha`,
      },
    ],
  },
  {
    key: 'okapiIncident',
    subject: 'Okapi cache-corruption postmortem',
    customer: true,
    mail: [
      {
        from: 'nadia',
        to: ['astrid'],
        cc: ['sam', 'omar', 'anika'],
        day: 35,
        time: [13, 20],
        body: `Astrid,

Sam's team spent the morning chasing test failures that turned out to be bad artifacts served from Cairn. Two different builds of our ledger service got the same cache key and one overwrote the other, so some runners restored a binary built with the wrong toolchain. Our restore-time digest check caught it before anything shipped, but main was red for most of the morning and we froze merges.

Omar helped purge the entries and we're green again.

I'd like a written postmortem with the root cause and what changes on your side, within a week if you can. The ledger is the one system we can't afford doubts about. Sam will send our timeline.

Nadia Petrov
Engineering Director, Okapi Payments`,
      },
      {
        from: 'astrid',
        to: ['nadia'],
        cc: ['sam', 'omar', 'anika'],
        day: 35,
        time: [14, 5],
        body: `Nadia, I'm sorry. Serving the wrong artifact is the worst failure a cache can have, and you shouldn't have needed your own verification to catch it.

Omar is leading the investigation and Anika is pulling server logs now. Until we have a root cause, Anika has put your org in read-only mode: Cairn serves existing entries but accepts no new writes. Builds will be slower, but nothing new can land under a bad key.

You'll have a draft postmortem within a week. Until then I'm your contact for anything.

Astrid`,
      },
      {
        from: 'sam',
        to: ['omar', 'anika'],
        cc: ['nadia', 'astrid'],
        day: 34,
        time: [10, 30],
        body: `Omar, Anika,

Timeline from our side, all UTC:

07:12 first failing test on main
07:40 bisected to a cached artifact, not a code change
09:05 cache disabled in CI as a stopgap
10:30 bad entries purged, cache re-enabled

The two builds ran on different runner images: our old pool on ubuntu-22.04 with clang 16, the new one on ubuntu-24.04 with clang 17. Same declared inputs, different compiler and glibc. We were halfway through moving pools, so both were live.

Logs from both runners are in the shared folder. Happy to rerun anything on our side.

Sam Reyes
Staff Engineer, Okapi Payments`,
      },
      {
        from: 'omar',
        to: ['sam', 'anika'],
        cc: ['nadia', 'astrid'],
        day: 33,
        time: [16, 15],
        body: `> Same declared inputs, different compiler and glibc.

Sam, that's the root cause, and your logs made it quick to confirm.

The key hashes declared inputs and the toolchain version you pin, but the compiler and system libraries came from the runner image, and the image wasn't in the key. So both pools computed the same key for the same action and both uploaded. We found 214 artifacts with that pattern across your ledger and settlement services and purged all of them.

The fix adds the runner image digest to the key, so builds on different images never share an entry. It's on staging behind a flag. I'd like to turn it on for your org first; expect one cold build per pool.

Omar`,
      },
      {
        from: 'anika',
        to: ['omar', 'sam'],
        cc: ['nadia', 'astrid'],
        day: 30,
        time: [15, 0],
        body: `Server side: the second write was accepted because we allowed last-writer-wins on an existing key. That was meant for retries of an interrupted upload, where the bytes match, but nothing checked that they did.

We're changing that to reject any write whose content hash differs from the stored one, and to alert our on-call when it happens. A rejected write fails only the upload, so the build still passes and simply doesn't populate the cache.

Your org is back in read-write mode as of this morning.

Anika`,
      },
      {
        from: 'omar',
        to: ['nadia', 'sam'],
        cc: ['astrid', 'anika'],
        day: 28,
        time: [17, 40],
        starred: true,
        body: `Nadia, Sam,

The draft postmortem is in the shared doc: summary, a timeline merged with Sam's, root cause, and six action items with owners. The two that matter most, the image digest in the key and rejecting mismatched writes, are on staging now.

It also covers what went badly on our side. Nobody owned customer updates for the first 40 minutes, and our own CLI didn't verify digests on restore by default. Both have owners.

Can we go through it on the review call Friday? Comments in the doc beforehand are welcome.

Omar`,
      },
      {
        from: 'nadia',
        to: ['omar'],
        cc: ['sam', 'astrid', 'anika'],
        day: 26,
        time: [12, 10],
        body: `Read it twice. Clear and honest, thank you.

Sam and I went through it with our platform leads yesterday. The consensus was that it explains the failure better than our internal write-up did, and owning the 40 minutes without a customer update counted for more with us than any single fix.

One addition before this afternoon's review: we'd like the hash-mismatch alert to reach us too, not only your on-call. A rejected write on our org means one of our actions isn't hermetic, and only we can fix that. Today we'd find out by accident.

The simplest path for us is a webhook into our PagerDuty, using an Events API v2 integration key that Sam will send, routed to our build-infra rotation. An email copy to security@okapipay.com would help our audit trail.

On our side, Sam's team will fail the CI job behind a rejected write and flag the action as non-hermetic, and we'll keep restore-time digest verification on in every pipeline.

Two questions for Astrid:
1. What will the payload carry? We'd want the key, both digests, the runner image and the pipeline that wrote first.
2. Can you send us a test event before this ships, so we can wire up the routing?

Nadia Petrov
Engineering Director, Okapi Payments`,
      },
      {
        from: 'astrid',
        to: ['nadia', 'sam'],
        cc: ['omar', 'anika'],
        day: 21,
        time: [9, 35],
        body: `Nadia, Sam,

Following up from Friday's review: the image-digest key and the write rejection are both in production, and your org has been on the new key for a week with no repeats. Customer-facing hash-mismatch alerts ship with 1.8, along with blob paths derived from the digest, the last open action item.

On your ask: 1.8 sends the alert as a webhook in PagerDuty Events API v2 format, so Sam's integration key works as is, with an optional email copy. The payload carries the key, both digests, the runner image digest, and the pipeline and job of the first writer. We'll send a test event in release week, and I've put a follow-up on the calendar for the week after so Omar can walk you and Sam through it.

As agreed on the call, we're crediting Okapi 100% of the incident month. It will show on your next invoice.

I've updated the action items in the doc.

Astrid`,
      },
    ],
  },
  {
    key: 'brightwaterIntro',
    subject: 'Brightwater intro and pricing',
    customer: true,
    mail: [
      {
        from: 'leo',
        to: ['kofi', 'astrid'],
        cc: ['mila'],
        day: 9,
        time: [21, 0],
        starred: true,
        body: `Kofi, Astrid,

Good to meet you at the build-systems meetup, and thanks for the demo on your laptop. As promised: our Unreal builds take 50 minutes in CI, and most of that is recompiling and recooking things nobody touched. Engineers have started batching changes to dodge the queue, which is the opposite of what we want.

Mila runs our build team and is copied here. She can tell you more than I can about where the time goes.

We'd like something in place before our next milestone build, about six weeks out. Who should we talk to about pricing?

Leo Marchetti
CTO, Brightwater Games`,
      },
      {
        from: 'kofi',
        to: ['leo'],
        cc: ['mila', 'lucia', 'astrid'],
        day: 8,
        time: [14, 20],
        body: `Leo, great to hear from you, and hi Mila.

Unreal is a good fit. C++ compilation caches well once compiler flags are part of the key, and shader compilation and asset cooking cache well once their inputs are declared, which for cooking usually means the source asset, the cook settings and the engine version. Packaging is harder to cache and most teams leave it alone.

Adding Lucía for pricing.

Mila, if you can share the shape of a typical build, roughly how long each stage takes and how many agents you run, I can tell you which steps we'd hit and what a realistic saving looks like.

Kofi`,
      },
      {
        from: 'mila',
        to: ['kofi'],
        cc: ['leo', 'lucia', 'astrid'],
        day: 6,
        time: [18, 45],
        body: `Kofi,

Roughly 22 minutes of C++ compile, 18 of asset cooking and 10 of packaging. About 40 engineers and 12 build agents, all Windows, with around 3 TB of cooked assets at any time. Most changes touch gameplay code or a handful of assets, so in theory very little needs rebuilding.

We're on Perforce, not git. Is that a problem? Most tools we've evaluated assume a git commit is the unit of change.

Mila Novak
Engineering Manager, Brightwater Games`,
      },
      {
        from: 'lucia',
        to: ['leo', 'mila'],
        cc: ['kofi', 'astrid'],
        day: 2,
        time: [15, 10],
        body: `> We're on Perforce, not git. Is that a problem?

Not at all. The agent keys on file contents, not commits, so it doesn't care which version control you use.

For 40 engineers on Business it comes to about $1,800 a month: $1,240 for seats, plus $559 for storage, which is the $499 base with 2 TB included and $60 for your third terabyte.

I'd suggest a two-week trial on one stream first, so you see real hit rates before you commit. Kofi can help Mila set it up on two of the 12 agents. I've sent an invite for an intro call next Monday to scope it.

Lucía`,
      },
      {
        from: 'leo',
        to: ['lucia'],
        cc: ['mila', 'kofi', 'astrid'],
        day: 1,
        time: [20, 30],
        body: `A trial on our main stream sounds right. Mila and I will both be on Monday's call.

Leo`,
      },
    ],
  },
];
//
// Pipeline threads: the sales conversations behind the Sales pipeline deals the customer threads above do not cover.
//

const PIPELINE_THREADS: Thread[] = [
  {
    key: 'halcyonInbound',
    subject: "Cairn for Halcyon Freight's Android builds",
    customer: true,
    mail: [
      {
        from: 'priya',
        to: ['astrid'],
        day: 8,
        time: [13, 20],
        body: `Hi Astrid,

I read the Monorepo Notes piece on Gradle build caches and followed the link to Cairn. We're about 30 engineers on a Kotlin and Android codebase, with CI on GitHub Actions. Clean builds take 35 minutes and the Gradle cache we run on a single VM is full by Wednesday every week.

Two questions before I take this to my manager: does Cairn work as a Gradle remote cache without a plugin of our own, and can we try it on one repo without a sales process?

Priya Raman
Platform Engineer, Halcyon Freight`,
      },
      {
        from: 'astrid',
        to: ['priya'],
        cc: ['kofi', 'lucia'],
        day: 7,
        time: [9, 40],
        body: `Hi Priya,

Yes to both. Cairn speaks the Gradle HTTP cache protocol, so it is a URL and a token in settings.gradle. The Team plan has a free 14-day trial and needs no call to start.

That said, a full VM by midweek usually means outputs that should not be cached at all, so a short call would save you a week. Kofi has tuned a lot of Android builds and can look at a build scan with you. Lucía is copied for pricing once you know what you need.

Astrid`,
      },
      {
        from: 'priya',
        to: ['astrid', 'kofi'],
        cc: ['lucia'],
        day: 5,
        time: [15, 5],
        body: `Thanks both. I've started the trial on our main app repo and booked 30 minutes next Tuesday. I'll bring a build scan from a clean CI run.

Priya`,
      },
    ],
  },
  {
    key: 'kestrelInbound',
    subject: 'Remote cache for a Bazel monorepo at Kestrel',
    customer: true,
    mail: [
      {
        from: 'owen',
        to: ['astrid', 'kofi'],
        day: 2,
        time: [16, 30],
        body: `Hello,

Your Cache Line issue on affected-target detection was passed around our team last week. We run grid-management software from one Bazel monorepo: 140 engineers, about 9,000 targets, and a self-hosted bazel-remote on two machines that we keep resizing.

We'd like to stop operating the cache ourselves. Before anyone on our side spends time on it, I need to know three things: whether you support the Bazel remote APIs including remote execution, where data is stored, and what a team our size pays.

Owen Fairley
Build Infrastructure Lead, Kestrel Energy`,
      },
      {
        from: 'kofi',
        to: ['owen'],
        cc: ['astrid', 'lucia'],
        day: 1,
        time: [10, 15],
        body: `Hi Owen, thanks for reading.

> whether you support the Bazel remote APIs including remote execution

Remote caching, yes, over gRPC with the standard flags. Remote execution is not something we offer; most teams your size get the bigger win from a shared cache with a high hit rate first.

Data sits on Cloudflare R2 in the US by default, with an EU option. For 140 engineers you would be on Business, around $3,500 a month; Lucía can make that exact.

Could we do a discovery call next week? Bring a recent build event log and I'll show you what we'd hit.

Kofi`,
      },
      {
        from: 'owen',
        to: ['kofi'],
        cc: ['astrid', 'lucia'],
        day: 0,
        time: [9, 40],
        body: `No remote execution is fine for now. Friday next week works; I've accepted the invite and will bring two event logs, one clean and one incremental.

Owen`,
      },
    ],
  },
  {
    key: 'vantageDiscovery',
    subject: 'Vantage Aerospace: notes from discovery',
    customer: true,
    mail: [
      {
        from: 'claire',
        to: ['astrid'],
        cc: ['lucia'],
        day: 14,
        time: [18, 0],
        body: `Astrid, Lucía,

Thanks for the time yesterday. To confirm what we covered: 300 engineers across flight software and ground systems, CMake with ccache today, CI runs about 4,000 builds a day, and a full flight-software build takes 70 minutes. We'd like to get that under 15.

We have budget this fiscal year if we choose a vendor by the end of next quarter. I'm the decision maker for tooling; our security team will need to review anything that stores build output.

Can you send a short technical summary I can circulate internally?

Claire Dubois
Director of Software Engineering, Vantage Aerospace`,
      },
      {
        from: 'astrid',
        to: ['claire'],
        cc: ['lucia', 'omar'],
        day: 13,
        time: [11, 30],
        body: `Claire,

Here is the short version to circulate. Cairn replaces your ccache directories with a shared cache keyed on compiler, flags and inputs; builds on any runner reuse each other's output. For a codebase like yours we usually see full builds drop by 70 to 80 percent once the cache is warm.

Omar, who leads our cache engine, is copied. He can go deeper on how we key C++ builds and what we never store.

Astrid`,
      },
      {
        from: 'claire',
        to: ['astrid', 'omar'],
        cc: ['lucia'],
        day: 12,
        time: [17, 45],
        body: `That's what I needed. I've shared it with my leads. The open question will be where the data lives; I'll write separately about that.

Claire`,
      },
    ],
  },
  {
    key: 'vantageResidency',
    subject: 'Vantage: US-only data residency',
    customer: true,
    mail: [
      {
        from: 'claire',
        to: ['astrid'],
        cc: ['anika'],
        day: 6,
        time: [16, 20],
        body: `Astrid,

Some of our flight software is export-controlled, so our security team's first question is residency. Build output and cache metadata must stay in the US, and only US persons may have access to it.

Can you meet that today, or is it on a roadmap? If it is a dedicated deployment, we'd want to understand the cost before the deep dive.

Claire`,
      },
      {
        from: 'anika',
        to: ['claire'],
        cc: ['astrid'],
        day: 5,
        time: [10, 50],
        body: `Hi Claire,

Storage can be pinned to US-only R2 buckets today, and the Workers that serve your tenant can be restricted to US data centres. Access to production is limited to four of us, and we can name a US-person on-call rotation for your tenant.

What we can't do yet is a separate control plane, so cache metadata goes through the same API as other tenants, with the same encryption. I'd walk through exactly that in the deep dive so your security team can judge it.

Anika`,
      },
    ],
  },
  {
    key: 'meridianProposal',
    subject: 'Meridian paid plan proposal',
    customer: true,
    mail: [
      {
        from: 'lucia',
        to: ['aisha'],
        cc: ['astrid', 'kenji'],
        day: 2,
        time: [14, 30],
        body: `Aisha,

Following Kenji's sign-off, here is our proposal for the paid plan: 60 seats on Enterprise at $40 a seat per month, $28,800 a year, billed annually. It includes SAML, audit-log export and the SOC 2 Type I report within the 60 days Kenji asked for.

If you expect the trial to grow, we can price a ramp: seats added in the first year at the same rate, prorated monthly.

The order form follows once you confirm the seat count.

Lucía`,
      },
      {
        from: 'aisha',
        to: ['lucia', 'astrid'],
        cc: ['kenji'],
        day: 1,
        time: [19, 10],
        body: `Lucía,

60 to start, but two more teams join in Q2, so call it 90 by June. Please add the ramp. Procurement will also ask for the SOC 2 condition to be written into the order form rather than an email.

Can we review it together next week before it goes to them?

Aisha`,
      },
      {
        from: 'lucia',
        to: ['aisha'],
        cc: ['astrid', 'kenji'],
        day: 0,
        time: [10, 30],
        body: `> Please add the ramp.

Done: 60 seats now, up to 90 at the same rate, and the SOC 2 Type I delivery date as a clause in the order form. I've sent an invite for Wednesday to walk through it with you and Kenji.

Lucía`,
      },
    ],
  },
  {
    key: 'tidewaterSecurity',
    subject: 'Tidewater vendor security review',
    customer: true,
    mail: [
      {
        from: 'rohan',
        to: ['astrid'],
        cc: ['anika'],
        day: 28,
        time: [15, 10],
        body: `Astrid,

Our security team has finished the paper review of Cairn. Three items before they can approve:

- Evidence that tokens are scoped per project and revocable without a redeploy.
- Your breach-notification window. Our regulator expects us to hear within 48 hours.
- Whether build logs, which can contain policy numbers in test fixtures, are ever stored.

They'd like to cover these on a call next week rather than over email.

Rohan Mehta
VP Platform Engineering, Tidewater Insurance`,
      },
      {
        from: 'anika',
        to: ['rohan'],
        cc: ['astrid'],
        day: 27,
        time: [9, 0],
        body: `Rohan,

Short answers so your team can prepare: tokens are per project and revoke immediately from the dashboard or the API; our standard breach notice is 72 hours, and we can commit to 48 in your contract; build logs are never stored, only content-addressed outputs and their hashes.

I'll demo token revocation live on the call. Tuesday afternoon your time works for me.

Anika`,
      },
      {
        from: 'rohan',
        to: ['astrid', 'anika'],
        day: 21,
        time: [20, 5],
        body: `Security approved this afternoon, conditional on the 48-hour notice appearing in the MSA. Legal will send redlines next.

Rohan`,
      },
    ],
  },
  {
    key: 'tidewaterMsa',
    subject: 'Tidewater MSA redlines',
    customer: true,
    mail: [
      {
        from: 'rohan',
        to: ['lucia'],
        cc: ['astrid'],
        day: 13,
        time: [14, 45],
        body: `Lucía,

Our legal team's redlines on the MSA are attached to the shared folder. The ones that matter:

- Liability cap at three times annual fees, not one.
- 48-hour breach notification, as agreed with security.
- 99.9% monthly uptime with service credits, not a best-efforts clause.

Everything else is wording. We'd like to sign this month; 220 seats on Enterprise is what we have budget for.

Rohan`,
      },
      {
        from: 'lucia',
        to: ['rohan'],
        cc: ['astrid'],
        day: 12,
        time: [10, 20],
        body: `Rohan,

48 hours and 99.9% with credits are both fine; they match what we already run to. The liability cap is the hard one. Three times fees is beyond what our insurance covers, so we can offer two times, with uncapped liability for a data breach caused by our negligence.

220 seats at $40 a seat per month is $105,600 a year. I can hold that rate for a second year if you sign this month.

Lucía`,
      },
      {
        from: 'rohan',
        to: ['lucia'],
        cc: ['astrid'],
        day: 7,
        time: [18, 30],
        body: `Legal can accept two times with the breach carve-out. They want the uptime credits to apply automatically rather than on request. If you agree to that, we're down to signatures.

Rohan`,
      },
      {
        from: 'astrid',
        to: ['rohan'],
        cc: ['lucia'],
        day: 6,
        time: [9, 15],
        body: `> They want the uptime credits to apply automatically

Agreed. Anika already reports uptime per tenant, so credits can follow from it. Lucía will send the final MSA and order form; let's go through them together on Thursday so legal has one clean version.

Astrid`,
      },
    ],
  },
  {
    key: 'lumenSigned',
    subject: 'Lumen Biotech order form',
    customer: true,
    mail: [
      {
        from: 'lucia',
        to: ['tobias'],
        cc: ['astrid'],
        day: 23,
        time: [11, 0],
        body: `Tobias,

The order form is in your inbox for signature: 150 seats on Enterprise, $72,000 a year with the research-institution discount we discussed, starting on signature. It includes SAML, the EU region and priority support.

Once it's signed, Astrid will introduce your onboarding team.

Lucía`,
      },
      {
        from: 'tobias',
        to: ['lucia'],
        cc: ['astrid'],
        day: 21,
        time: [16, 40],
        body: `Signed and returned. The validation runs settled it: our pipeline builds went from 41 minutes to 9 with a warm cache, and the cluster team stopped asking for more disk.

Tobias Lindqvist
Head of Research Computing, Lumen Biotech`,
      },
      {
        from: 'astrid',
        to: ['tobias'],
        cc: ['lucia', 'kofi', 'june'],
        day: 20,
        time: [9, 30],
        body: `Welcome aboard, Tobias, and thank you.

Kofi will run your rollout and June will set up SAML with your identity team. They'll start with the pipelines from the validation, then move the remaining groups one at a time so we can watch hit rates as we go.

Astrid`,
      },
    ],
  },
  {
    key: 'lumenRollout',
    subject: 'Lumen rollout: second pipeline group',
    customer: true,
    mail: [
      {
        from: 'tobias',
        to: ['kofi'],
        cc: ['astrid', 'june'],
        day: 9,
        time: [13, 5],
        body: `Kofi,

First group is settled: hit rate 88% over the week and no complaints. SAML is live for everyone, thanks June.

The second group is our imaging pipelines. They build large C++ libraries against two compiler versions, so I expect a lower hit rate at first. Anything we should change before we switch them over?

Tobias`,
      },
      {
        from: 'kofi',
        to: ['tobias'],
        cc: ['astrid', 'june'],
        day: 8,
        time: [10, 10],
        body: `Tobias,

Two things. Pin the compiler version in each pipeline's environment so the keys stay stable, and warm the cache with one build per compiler before you move the group. Expect around 60% the first week, rising as their branches converge.

Once the group has run for a week, send me the numbers and we'll decide whether a check-in is worth it.

Kofi`,
      },
      {
        from: 'tobias',
        to: ['kofi'],
        cc: ['astrid'],
        day: 7,
        time: [15, 50],
        body: `Will do. Warm-up builds are running tonight.

Tobias`,
      },
    ],
  },
  {
    key: 'pallasDecision',
    subject: 'Pallas Retail: decision on Cairn',
    customer: true,
    mail: [
      {
        from: 'carmen',
        to: ['astrid'],
        cc: ['lucia'],
        day: 16,
        time: [12, 25],
        body: `Astrid, Lucía,

Thank you for the demo and the proposal. We've decided not to go ahead this year. Our infrastructure board ruled that build output must stay in our own data centre in Madrid, and a hosted cache, even in an EU region, doesn't meet that. We'll run a self-hosted cache instead.

This was not about the product. The team liked it, and the hit rates in the demo were better than what we expect to get ourselves.

Carmen Ruiz
Engineering Director, Pallas Retail Group`,
      },
      {
        from: 'astrid',
        to: ['carmen'],
        cc: ['lucia'],
        day: 15,
        time: [9, 5],
        body: `Carmen,

Thank you for telling us directly, and for the reason. A customer-hosted tier is something we're weighing for next year; if it happens, you'll be among the first we call.

Astrid`,
      },
      {
        from: 'carmen',
        to: ['astrid'],
        day: 14,
        time: [17, 0],
        body: `Please do. Good luck with the 1.8 release.

Carmen`,
      },
    ],
  },
  {
    key: 'corvidEvaluation',
    subject: 'Corvid Analytics: Pants remote cache evaluation',
    customer: true,
    mail: [
      {
        from: 'daniel',
        to: ['astrid'],
        cc: ['kofi'],
        day: 22,
        time: [11, 10],
        body: `Hi Astrid,

Thanks for the call last week. I took Cairn to our engineering leadership and the budget for an evaluation is approved.

For context: about 180 engineers on one Python and Rust monorepo built with Pants, with CI on Buildkite. Median CI time is 28 minutes and most of it is rebuilding Rust crates nobody touched.

Before we start, two requirements. The cache must work with the Pants remote cache settings we already have, and our security team needs to know where artifacts are stored. Can Kofi run a technical evaluation with us in the next few weeks?

Daniel Okafor
Head of Developer Productivity, Corvid Analytics`,
      },
      {
        from: 'astrid',
        to: ['daniel'],
        cc: ['kofi', 'lucia'],
        day: 21,
        time: [9, 25],
        body: `Hi Daniel,

Good news on the budget. Pants speaks the Bazel remote APIs, so Cairn works with your existing remote_store_address and a token; no plugin needed. Artifacts are stored on Cloudflare R2 in the US by default, and I'll send our data handling summary for your security team.

Kofi will run the evaluation. Lucía is copied for the commercial side once you know your seat count.

Astrid`,
      },
      {
        from: 'daniel',
        to: ['astrid', 'kofi'],
        cc: ['lucia'],
        day: 19,
        time: [15, 40],
        body: `That works. I've booked the technical evaluation with Kofi and will bring two weeks of CI timings so we can compare hit rates.

Daniel`,
      },
    ],
  },
  {
    key: 'larkspurDemo',
    subject: 'Nx remote cache demo for Larkspur Media',
    customer: true,
    mail: [
      {
        from: 'yuki',
        to: ['astrid', 'kofi'],
        day: 16,
        time: [14, 5],
        body: `Hi both,

We build our web, TV and mobile apps from one Nx monorepo, about 120 engineers. Nx Cloud is getting expensive and we'd rather own where our cache lives.

Could you show us Cairn as an Nx remote cache? I'd like our two tech leads in the room, and ideally you'd run it against a fork of one of our repos.

Yuki Tanaka
Staff Engineer, Developer Experience, Larkspur Media`,
      },
      {
        from: 'kofi',
        to: ['yuki'],
        cc: ['astrid', 'lucia'],
        day: 15,
        time: [10, 30],
        body: `Hi Yuki,

Happy to. Cairn implements the Nx remote cache API, so the demo is one environment variable change on your fork. Send me the fork and a CI run we can replay, and I'll show cold and warm builds side by side.

I've sent an invite for a 45-minute demo. Lucía can walk through pricing at the end if that's useful.

Kofi`,
      },
    ],
  },
  {
    key: 'aldermoorProposal',
    subject: 'Aldermoor Bank: Enterprise proposal',
    customer: true,
    mail: [
      {
        from: 'henrik',
        to: ['astrid'],
        cc: ['lucia'],
        day: 28,
        time: [10, 0],
        body: `Hi Astrid,

The demo landed well with the platform team. We're moving 400 engineers from Maven to Bazel this year and want the cache in place before the first services move.

Please send a proposal for Enterprise. Two requirements from our risk office: all data in the EU region, and a customer-managed encryption key.

Henrik Solberg
Director of Engineering Platforms, Aldermoor Bank`,
      },
      {
        from: 'lucia',
        to: ['henrik'],
        cc: ['astrid'],
        day: 27,
        time: [16, 20],
        body: `Hi Henrik,

Here is the proposal in short: Enterprise for 400 seats, EU region only, with customer-managed keys through your KMS, and the migration support Kofi described in the demo. The order form follows once procurement has reviewed the terms.

Happy to walk your procurement team through it.

Lucía`,
      },
      {
        from: 'henrik',
        to: ['lucia', 'astrid'],
        day: 26,
        time: [11, 45],
        body: `Thanks, Lucía. Procurement has it. Let's review it together with their questions; I'll send a time.

Henrik`,
      },
    ],
  },
];

const VENDOR_THREADS: Thread[] = [
  {
    key: 'stripeBilling',
    subject: 'Stripe usage-based billing migration',
    mail: [
      {
        from: 'june',
        to: ['dana'],
        cc: ['astrid'],
        day: 29,
        time: [13, 0],
        body: `Hi Dana,

We're moving Cairn from flat per-seat plans to per-seat plus metered cache storage, using billing meters. Seats stay priced as today, and storage above each tier's included amount bills per GB-month. Two questions before we start:

1. Can existing subscriptions move to the new price without a proration charge? We'd like the change to take effect at each customer's next invoice, not mid-cycle.
2. Is there a rate limit on meter events? We'd report storage hourly per customer, about 300 customers, so roughly 7,200 events a day.

June Okonkwo
Alien Labs`,
      },
      {
        from: 'dana',
        to: ['june'],
        cc: ['astrid'],
        day: 27,
        time: [17, 30],
        body: `June,

1. Yes. Update the subscription items with proration_behavior set to none and the change shows up on the next invoice. Do it in one update call per subscription so the seat and metered items change together.
2. Hourly per customer is far below the limits, even with a backfill. Send an identifier with each event so retries don't double count.

Before you migrate production I'd check two things: how annual prepay credits apply to the new metered price, and whether your invoices show meter usage clearly enough for your customers' finance teams.

Happy to run a working session with your team first.

Dana Whitfield
Account Executive, Stripe`,
      },
      {
        from: 'june',
        to: ['dana'],
        day: 23,
        time: [14, 45],
        body: `Dana,

A working session would help. The meter works in test mode and invoice previews look right for monthly customers, but credits for annual prepay customers don't apply to the metered line. The credit grant draws down against seats and storage bills in full, so a prepay customer would get an invoice they didn't expect.

Could you bring someone from billing? Thursday works for us, any time after 15:00 UTC.

June`,
      },
      {
        from: 'dana',
        to: ['june'],
        day: 21,
        time: [16, 20],
        body: `Booked for Thursday at 16:00 UTC, and I'll bring one of our billing solutions engineers who has worked on credit grants.

Send the test-mode customer IDs ahead of time, one monthly and one annual prepay, so we can look at the configuration before the call rather than during it.

Dana`,
      },
      {
        from: 'june',
        to: ['dana'],
        cc: ['astrid'],
        day: 19,
        time: [10, 15],
        body: `Dana,

Thanks for yesterday. Switching the credit grant to apply to all prices fixed the prepay case, and the test-mode invoices now match our spreadsheet to the cent for both customers.

We'll migrate ten customers next week, monthly plans first, and the rest the week after. I'll send the subscription IDs on Monday in case you want to watch them.

June`,
      },
      {
        from: 'dana',
        to: ['june'],
        day: 15,
        time: [18, 0],
        body: `Great to hear. If invoice finalization runs slow during the move, ping me and we'll watch it from our side.

It's also worth subscribing to the invoice.finalization_failed webhook if you haven't, so a failed invoice doesn't sit until the next billing run.

Dana`,
      },
    ],
  },
  {
    key: 'cloudflareCredits',
    subject: 'Cloudflare credits and an annual commit',
    mail: [
      {
        from: 'elena',
        to: ['astrid'],
        cc: ['anika'],
        day: 19,
        time: [17, 10],
        body: `Hi Astrid,

Following up on our call: you qualify for $25,000 in Cloudflare for Startups credits, valid for twelve months. They apply to most developer platform products, including Workers, Containers and R2, but not to add-on services or support plans.

Separately, your Workers and Containers spend has been steady for six months, so a one-year committed-use contract at your current baseline would cut that bill by about 28%. The commit applies across products and regions, so it would survive a change of instance type.

I'll submit the credit application once you confirm.

Elena Marsh
Solutions Architect, Cloudflare`,
      },
      {
        from: 'astrid',
        to: ['elena'],
        cc: ['anika'],
        day: 16,
        time: [8, 40],
        body: `Thanks Elena. Credits, yes please.

On the commit: Anika is about to move the cache nodes to arm64, which changes our baseline. Her benchmarks showed the same p99 for about 20% less, so I'd rather commit once against the new number.

Anika, can you size the commitment after the move?

Astrid`,
      },
      {
        from: 'anika',
        to: ['elena'],
        cc: ['astrid'],
        day: 12,
        time: [15, 25],
        body: `Hi Elena,

The arm64 move is done for cache nodes and baseline compute dropped about 20%, in line with the benchmarks. I'd commit to $4.10 an hour, roughly 80% of the new baseline, which leaves headroom for the spikes around customer release days.

Could you also review the setup with us before we commit? We're adding a dedicated US region for one customer, and I'd like to know how that changes what we can commit to.

Anika`,
      },
      {
        from: 'elena',
        to: ['anika', 'astrid'],
        day: 7,
        time: [16, 50],
        body: `Credits are on your account. I've set up an architecture review for the week after next to cover the commit and the new region together.

If you can, bring a billing export of the last three months grouped by product.

Elena`,
      },
    ],
  },
  {
    key: 'cloudflareR2',
    subject: 'Cloudflare R2 egress pricing',
    mail: [
      {
        from: 'omar',
        to: ['ines'],
        cc: ['felix', 'astrid'],
        day: 13,
        time: [14, 10],
        body: `Hi Inês,

We serve cache artifacts from S3 today and egress is now our second-largest cost after compute. Our customers' CI fleets read far more than they write, so the bill grows with every customer we add. We're testing R2 as the read tier, with S3 staying the system of record.

Two questions:
1. Does zero egress hold at our volume, about 400 TB a month?
2. Is there a minimum commit on the enterprise plan?

Felix is building the cost model and is copied here.

Omar Haddad
Alien Labs`,
      },
      {
        from: 'ines',
        to: ['omar'],
        cc: ['felix', 'astrid'],
        day: 8,
        time: [10, 0],
        body: `Hi Omar,

R2 has no egress fees at any volume, including yours. At your read rate the cost is in Class B operations, so check your request count: small artifacts read many times add up faster than storage does.

Enterprise has a minimum annual commit, sized to your expected storage and operations. It includes a named support contact and jurisdiction controls, if any of your customers need data kept in the EU. Easier to walk through on a call once Felix has the request numbers.

Inês Duarte
Enterprise Account Executive, Cloudflare`,
      },
      {
        from: 'felix',
        to: ['ines'],
        cc: ['omar', 'astrid'],
        day: 5,
        time: [11, 30],
        body: `Inês,

Ran the numbers: about 1.9 billion reads a month. Even with operation costs we'd save around 60% against S3 egress, and more as reads grow, since our median artifact is small.

Let's do the call on the Tuesday after our release. Omar and I will both join.

Felix`,
      },
    ],
  },
  {
    key: 'githubPartner',
    subject: 'GitHub Actions integration partner program',
    mail: [
      {
        from: 'sofia',
        to: ['kofi'],
        cc: ['astrid'],
        day: 40,
        time: [17, 0],
        body: `Hi Kofi,

Thanks for applying to the Actions integration partner program. The setup-cairn action looks in good shape, and the README is clearer than most we review. To be listed as a verified partner we need:

- the action published under your organization, not a personal account
- a security contact who can receive vulnerability reports
- docs covering self-hosted runners, which many of our enterprise customers use

Once those are in place I'll schedule the technical review. It usually takes a week.

Sofia Brandt
Partner Manager, GitHub`,
      },
      {
        from: 'kofi',
        to: ['sofia'],
        day: 36,
        time: [15, 15],
        body: `Hi Sofia,

The action is published under alien-labs, and security@alienlabs.io is our contact; it reaches Anika and Omar.

Self-hosted runner docs are the gap. They'll be up within two weeks, including how to keep the cache volume warm on ephemeral runners, which is the question we get most.

Kofi`,
      },
      {
        from: 'kofi',
        to: ['sofia'],
        day: 28,
        time: [13, 40],
        body: `Hi Sofia,

Self-hosted runner docs are live, including the cache-volume setup for ephemeral runners and a section on runners behind a proxy. Anything else before review?

Kofi`,
      },
      {
        from: 'sofia',
        to: ['kofi'],
        cc: ['astrid'],
        day: 22,
        time: [18, 30],
        body: `Hi Kofi,

Review passed. The verified badge and Marketplace listing go live with your next release, so time it with 1.8 if you can. Send me the release date and I'll line up the listing on our side.

Sofia`,
      },
    ],
  },
];

const WEEKLY_UPDATES: Array<{ readonly day: number; readonly body: string }> = [
  {
    day: 54,
    body: `Shipped: Cairn 1.7.2 with the eviction memory fix.
In progress: SCIM beta with two customers; arm64 benchmarks for cache nodes.
Hiring: backend loop for Lena Vogt is being scheduled.

Cloudflare is forecast to go over budget this month, almost all of it compute. Anika's arm64 work is the fix, so expect the numbers next week.

Please put Q4 time off in the calendar by Friday.

Astrid`,
  },
  {
    day: 47,
    body: `Quiet week, which is what you want after a release.

- Kofi applied to GitHub's Actions partner program for setup-cairn.
- June is scoping usage-based billing on Stripe.
- Anika's arm64 numbers look good: same p99, about 20% cheaper.
- Omar's eviction worker now bounds the LRU by bytes, with a count ceiling as a backstop.

One page this week, disk pressure on cache-node-03. Felix has the pager next.

Astrid`,
  },
  {
    day: 40,
    body: `Northpine kicked off SSO today with Grace and Marcus. June owns it on our side; SCIM moves from beta to GA with this rollout. Their policy blocks IdP-initiated login and they want groups pushed over SCIM, so both get tested in staging first.

GitHub replied on the partner program. We need self-hosted runner docs before review, and Kofi is writing them.

June has the pager this week.

Astrid`,
  },
  {
    day: 33,
    body: `Rough week. Okapi hit cache corruption on Wednesday: two builds on different runner images shared a key and one overwrote the other. Their own digest check caught it, so nothing shipped, but their main branch was red for a morning.

Omar found the root cause and Anika is closing the server-side hole. Postmortem draft goes to Okapi next week. If you're touching cache keys, talk to Omar first.

What I want us to learn: nobody owned the customer update for the first 40 minutes. From now on the incident commander names a customer contact in the first ten minutes.

Astrid`,
  },
  {
    day: 26,
    body: `- Okapi postmortem reviewed with Nadia and Sam today. They want hash-mismatch alerts sent to their on-call too; that ships with 1.8.
- Meridian sent their vendor security questionnaire. Anika and I are on it.
- Northpine SSO is in production after June's token-revocation fix.
- Lena Vogt accepted. She starts in January.

Omar has the pager this week.

Astrid`,
  },
  {
    day: 19,
    body: `Stripe's working session fixed prepay credits on the metered line, so the billing migration starts next week with ten customers.

Cloudflare offered $25k in credits and an annual commit; Anika will size it after the arm64 move.

Hana starts Wednesday. Omar is her buddy, and her first task is the flaky eviction test.

Astrid`,
  },
  {
    day: 12,
    body: `Welcome Hana! She has already reproduced the flaky eviction test and has a fix in review.

Northpine opened their renewal: 180 seats plus a dedicated region. Lucía is quoting.

Omar is testing Cloudflare R2 as a read tier to cut our S3 egress bill. Early numbers from Felix point to a big saving.

The arm64 move for cache nodes is done.

Astrid`,
  },
  {
    day: 5,
    body: `Meridian's security review passed; paid plan paperwork next week. The condition is our SOC 2 Type I report within 60 days.

Cairn 1.8 ships next Friday with the runner-image cache key, hash-mismatch alerts, and the verified GitHub action. The Scribe will draft release notes. Tomás has the pager this week.

Brightwater Games, a studio on Unreal and Perforce, asked about pricing. Lucía and Kofi are on it.

Astrid`,
  },
];

const INTERNAL_THREADS: Thread[] = [
  {
    key: 'offsite',
    subject: 'Q4 offsite planning',
    mail: [
      {
        from: 'astrid',
        to: ['wren'],
        day: 30,
        time: [10, 20],
        body: `Hi Wren,

We're a team of ten planning a three-day offsite about two months from now, ideally midweek. We need a room for working sessions that seats everyone around tables, wifi good enough for video calls, and a bedroom for everyone. Most of us fly into Lisbon, so help with transfers from the airport would be welcome.

Do you have availability, and could you send rates for full board?

Astrid Holm
Engineering Manager, Alien Labs`,
      },
      {
        from: 'wren',
        to: ['astrid'],
        day: 27,
        time: [9, 45],
        starred: true,
        body: `Hi Astrid,

We'd be glad to host you, and we have midweek dates free in that window. The Dune Room seats twelve with a screen and has a breakout space next door. Ten rooms for three nights, full board, comes to \u20AC9,800, including coffee breaks and dinner on the last night in the old salt store. Fibre runs throughout the lodge, and teams regularly spend whole days on calls here.

We can arrange a minibus from Lisbon airport for \u20AC180 each way. The drive is about an hour.

We'd need a 30% deposit to hold the dates, with the balance due two weeks before arrival.

Warm regards,
Wren Calloway
Events Coordinator, Saltmarsh Lodge`,
      },
      {
        from: 'astrid',
        to: ['wren'],
        cc: ['lucia', 'ben'],
        day: 23,
        time: [11, 5],
        body: `Wren, that works for us, and yes to the minibus both ways. Lucía will handle the deposit and Ben is planning the sessions, so I've copied them both. Please send the invoice to Lucía.

Astrid`,
      },
      {
        from: 'ben',
        to: ['wren'],
        cc: ['astrid', 'lucia'],
        day: 16,
        time: [14, 35],
        body: `Hi Wren,

For the working sessions we'd like two tables of five rather than theatre seating, and a whiteboard or two we can leave writing on overnight. A flip chart would help too.

Is there somewhere outdoors we could use for one afternoon? We'd like to hold the roadmap session away from screens.

Ben`,
      },
      {
        from: 'wren',
        to: ['ben'],
        cc: ['astrid', 'lucia'],
        day: 9,
        time: [10, 30],
        body: `Hi Ben,

All doable. Two tables of five in the Dune Room, two whiteboards and a flip chart, and the room stays locked overnight so you can leave things up. The terrace above the dunes takes twelve comfortably and we'll set it up for your second afternoon, with a covered corner in case of wind.

Deposit received, thank you Lucía.

Wren`,
      },
      {
        from: 'lucia',
        to: ['wren'],
        cc: ['astrid', 'ben'],
        day: 2,
        time: [13, 50],
        body: `Hi Wren,

Final headcount is ten. Two vegetarians and one gluten-free; I'll send names with the rooming list on Friday.

Thanks Wren, see you next month.

Lucía`,
      },
    ],
  },
  {
    key: 'hanaOnboarding',
    subject: 'Welcome Hana',
    mail: [
      {
        from: 'astrid',
        to: ['hana'],
        cc: ['omar'],
        day: 14,
        time: [12, 15],
        body: `Hana, welcome to Alien Labs!

Today is mostly setup: laptop, accounts, and a walkthrough of the cache engine with Omar at 13:00. He's your onboarding buddy for the first month, so ask him anything, including the questions that feel too small to ask.

For the first week, aim to get one change merged, however small, and sit in on Friday's on-call handoff. Our first 1:1 is this afternoon after the walkthrough, and we'll talk about what you want your first 90 days to look like.

Astrid`,
      },
      {
        from: 'omar',
        to: ['hana'],
        cc: ['astrid'],
        day: 14,
        time: [16, 40],
        body: `Good to have you, Hana.

After the walkthrough, a good first task is the flaky eviction test Felix flagged: concurrent_eviction_respects_budget, which fails on the 16-core runners. Anika has pinned it to the regular pool for now. It touches most of the engine without being risky, and you'll learn the eviction worker on the way.

Ask in #cache-engine or ping me directly. Nothing is a bother this month.

Omar`,
      },
      {
        from: 'hana',
        to: ['astrid', 'omar'],
        day: 13,
        time: [21, 5],
        body: `Thanks both. Laptop and accounts all work, and I've reproduced the eviction flake locally by running the test on tmpfs with 16 threads. The test checks the budget before the eviction worker has caught up. PR tomorrow.

Hana`,
      },
    ],
  },
  {
    key: 'releaseNotes',
    subject: 'Cairn 1.8 release notes draft',
    mail: [
      {
        from: 'scribe',
        to: ['astrid'],
        cc: ['kofi'],
        day: 2,
        time: [7, 30],
        body: `Draft release notes for Cairn 1.8, from the 31 pull requests merged and 18 issues closed since 1.7. Internal refactors and dependency bumps are left out.

Highlights
- Cache keys include the runner image digest, so builds on different images never share an artifact.
- Writes whose content hash differs from the stored artifact are rejected and raise an alert, now also sent to the customer by webhook or email.
- Blob paths are derived from the content digest, not the cache key.
- SCIM deactivation revokes API tokens and ends sessions.
- setup-cairn is a verified GitHub Actions partner integration.

Fixes
- Retry S3 multipart uploads on 503 with backoff.
- Fixed a flaky eviction test under heavy parallel load.

Upgrade notes
- Keys change in this release, so the first build on each runner image after upgrading is a cold build.

Reply with changes and I'll revise before Friday's release.`,
      },
      {
        from: 'astrid',
        to: ['scribe'],
        cc: ['kofi'],
        day: 1,
        time: [9, 20],
        body: `Looks good. Lead with the runner-image change and credit Okapi for the report; Nadia said yes. Drop the flaky test line, customers won't care.

Move the upgrade note up under the highlights. Someone will be surprised by a cold build otherwise.

Astrid`,
      },
    ],
  },
  ...WEEKLY_UPDATES.map(({ day, body }, index): Thread => ({
    key: 'weeklyUpdate',
    subject: `Weekly update #${31 + index}`,
    mail: [
      {
        from: 'astrid',
        to: ['omar', 'felix', 'june', 'tomas', 'anika', 'ben', 'lucia', 'kofi', 'hana'],
        day,
        time: [18, 30],
        body,
      },
    ],
  })),
];

//
// Background threads: everyday team mail, with Astrid copied where she isn't a recipient.
//

const BACKGROUND_THREADS: Thread[] = [
  {
    subject: 'Review: LRU bound in the eviction worker',
    archived: true,
    mail: [
      {
        from: 'felix',
        to: ['omar'],
        cc: ['astrid'],
        day: 51,
        time: [10, 15],
        body: `Omar, on the eviction PR: why bound the LRU by entry count rather than bytes? A few large artifacts could still blow the memory budget. Northpine's simulation bundles run to 2 GB each, so twenty of them would fill a node on their own.

Otherwise the change looks good. The tests cover the ordering cases I'd have asked about.

Felix`,
      },
      {
        from: 'omar',
        to: ['felix'],
        cc: ['astrid'],
        day: 51,
        time: [13, 40],
        body: `> why bound the LRU by entry count rather than bytes?

Fair point. Count was cheaper to track, but you're right that it doesn't protect us. I'll switch to bytes, with a count ceiling as a backstop so millions of tiny entries can't exhaust the index either.

New revision this afternoon.

Omar`,
      },
      {
        from: 'felix',
        to: ['omar'],
        cc: ['astrid'],
        day: 50,
        time: [9, 5],
        body: `Approved. Thanks for the quick turnaround.

Felix`,
      },
    ],
  },
  {
    subject: 'Flaky test in the cache-engine integration suite',
    mail: [
      {
        from: 'felix',
        to: ['omar', 'anika'],
        cc: ['astrid'],
        day: 22,
        time: [11, 0],
        body: `concurrent_eviction_respects_budget failed three times on main this week, always on the 16-core runners. Can't reproduce on my laptop, even with the same seed.

Each time the budget is exceeded by a few hundred KB for one check, then recovers. Smells like timing rather than a real leak.

Felix`,
      },
      {
        from: 'anika',
        to: ['felix', 'omar'],
        cc: ['astrid'],
        day: 22,
        time: [14, 30],
        body: `The 16-core pool runs on tmpfs, so disk writes are effectively free and the eviction thread falls behind the writers. That would match a brief overshoot.

Want me to pin the suite to the regular pool while you dig in?

Anika`,
      },
      {
        from: 'omar',
        to: ['felix', 'anika'],
        cc: ['astrid'],
        day: 21,
        time: [8, 55],
        body: `Pin it for now. It'd make a good first task for Hana when she starts.

Omar`,
      },
    ],
  },
  {
    subject: 'PTO: three days in November',
    archived: true,
    mail: [
      {
        from: 'june',
        to: ['astrid'],
        day: 37,
        time: [9, 30],
        body: `Hi Astrid,

I'd like to take three days off in mid-November for a family wedding, Wednesday to Friday. SSO for Northpine will be long done by then, and Felix has agreed to cover billing questions while I'm away.

June`,
      },
      {
        from: 'astrid',
        to: ['june'],
        day: 36,
        time: [8, 10],
        body: `Approved, enjoy the wedding. Please add it to the team calendar.

Astrid`,
      },
    ],
  },
  {
    subject: 'Interview loop: Lena Vogt (backend)',
    archived: true,
    mail: [
      {
        from: 'astrid',
        to: ['omar', 'felix'],
        day: 34,
        time: [12, 0],
        body: `Lena Vogt is in for the backend loop on Monday afternoon. Omar on systems design, Felix on the coding exercise.

She's coming from a storage team at a large CDN, so push on consistency and failure modes rather than basics. Scorecards by end of day, please, before you talk to each other.

Astrid`,
      },
      {
        from: 'omar',
        to: ['astrid'],
        cc: ['felix'],
        day: 33,
        time: [9, 45],
        body: `Works for me. I'll use the cache-sharding problem.

Omar`,
      },
    ],
  },
  {
    subject: 'Expense: KubeCon travel',
    archived: true,
    mail: [
      {
        from: 'kofi',
        to: ['astrid'],
        day: 44,
        time: [16, 0],
        body: `Hi Astrid,

Submitted my KubeCon expenses: flights, three hotel nights and the booth materials. \u20AC1,940 total, receipts are in the expense tool.

We scanned 212 badges at the booth. I've sent the list to Lucía, and about 30 asked for a trial.

Kofi`,
      },
      {
        from: 'astrid',
        to: ['kofi'],
        day: 43,
        time: [8, 35],
        body: `Approved. Good booth traffic this year.

Astrid`,
      },
    ],
  },
  {
    subject: 'Home office stipend',
    mail: [
      {
        from: 'hana',
        to: ['astrid'],
        day: 12,
        time: [15, 20],
        body: `Hi Astrid,

What does the home office stipend cover? I'm looking at a monitor and a desk chair, about \u20AC650 together. Do I buy first and claim it back, or does it need approval up front?

Hana`,
      },
      {
        from: 'astrid',
        to: ['hana'],
        day: 9,
        time: [9, 0],
        body: `Both. It's \u20AC800 in your first year for anything that makes your desk work better, and \u20AC300 a year after that. Buy first, then submit the receipts in the expense tool and I'll approve them.

Astrid`,
      },
    ],
  },
  {
    subject: 'Interview panel: Imogen Clarke',
    mail: [
      {
        from: 'astrid',
        to: ['june', 'tomas'],
        day: 14,
        time: [9, 25],
        body: `Imogen Clarke is interviewing for the frontend role. June, can you take the API design conversation? Tomás, the pairing session.

Her portfolio is mostly data-heavy dashboards, which is close to what we build. Scorecards before the debrief, please.

Astrid`,
      },
      {
        from: 'tomas',
        to: ['astrid'],
        cc: ['june'],
        day: 13,
        time: [10, 50],
        body: `Happy to. I'll use the dashboard empty-states task; it's small enough for an hour.

Tomás`,
      },
    ],
  },
  {
    subject: 'Design review: cache dashboard empty states',
    mail: [
      {
        from: 'ben',
        to: ['tomas', 'lucia'],
        cc: ['astrid'],
        day: 7,
        time: [13, 0],
        body: `New empty states for the cache dashboard are in Figma. The main change is a setup checklist for workspaces with no builds yet: install the agent, add setup-cairn to a workflow, run a first build.

Each step ticks itself off once we see the event. Comments in the file by Thursday, please.

Ben`,
      },
      {
        from: 'tomas',
        to: ['ben'],
        cc: ['lucia', 'astrid'],
        day: 6,
        time: [16, 25],
        body: `Love the checklist. Can the second step link straight to the setup-cairn docs? I'll start on it tomorrow.

Tomás`,
      },
    ],
  },
  {
    subject: 'On-call handoff: Anika to Felix',
    archived: true,
    mail: [
      {
        from: 'anika',
        to: ['felix'],
        cc: ['astrid'],
        day: 47,
        time: [15, 30],
        body: `Felix,

Quiet week. One page Tuesday night for disk pressure on cache-node-03, resolved by expanding the volume from 2 TB to 3 TB. The runbook now has the resize steps.

Nothing open. PostHog warnings on cache-node-07 disk are noisy; ack them unless usage passes 90%.

Anika`,
      },
    ],
  },
  {
    subject: 'On-call handoff: Anika to June',
    archived: true,
    mail: [
      {
        from: 'anika',
        to: ['june'],
        cc: ['astrid'],
        day: 40,
        time: [15, 30],
        body: `June,

Two pages this week, both 5xx bursts from one noisy customer's retry loop. I've asked support to contact them about backoff.

Watch the API error dashboard on Monday mornings, when their weekly builds kick off. If it happens again, rate-limit their key rather than scaling up.

Anika`,
      },
    ],
  },
  {
    subject: 'On-call handoff: Anika to Omar',
    mail: [
      {
        from: 'anika',
        to: ['omar'],
        cc: ['astrid'],
        day: 26,
        time: [15, 30],
        body: `Omar,

The hash-mismatch alert is live. It fired twice, both from a customer re-running a build with a patched compiler. Expected, but worth knowing it isn't always us.

If it fires for Okapi, tell Astrid before anything else; she's promised Nadia a heads-up until customer alerts ship.

Anika`,
      },
    ],
  },
  {
    subject: 'On-call handoff: Anika to Tomás',
    mail: [
      {
        from: 'anika',
        to: ['tomas'],
        cc: ['astrid'],
        day: 5,
        time: [15, 30],
        body: `Tomás,

Nothing open. The disk alerts on cache-node-07 are tuned now, so a page there is real. S3 multipart retries are above baseline, but Felix's retry fix is in review and should settle them.

I'm a phone call away. Release is next Friday, so expect a busy afternoon.

Anika`,
      },
    ],
  },
  {
    subject: 'Out Friday afternoon',
    archived: true,
    mail: [
      {
        from: 'tomas',
        to: ['astrid'],
        day: 48,
        time: [10, 0],
        body: `Heads up, I'm out Friday from 2pm for a dentist appointment. The dashboard PR will be up before then, and Ben can answer design questions on it.

Tomás`,
      },
    ],
  },
  {
    subject: 'Late start today',
    archived: true,
    mail: [
      {
        from: 'ben',
        to: ['astrid'],
        day: 27,
        time: [8, 15],
        body: `I'll be in late today, around 11, after a doctor's appointment. I'll move the design crit to the afternoon.

Ben`,
      },
    ],
  },
  {
    subject: 'Interview panel: Rafael Costa',
    archived: true,
    mail: [
      {
        from: 'astrid',
        to: ['anika', 'june'],
        day: 20,
        time: [11, 40],
        body: `Rafael Costa's SRE loop is booked. Anika on incident response, June on the systems conversation. Same scorecard as last time.

Anika, it's fair to use the Okapi incident as the scenario now that the postmortem is written up. Leave out the customer's name.

Astrid`,
      },
    ],
  },
  {
    subject: 'Expense: replacement laptop charger',
    archived: true,
    mail: [
      {
        from: 'felix',
        to: ['astrid'],
        day: 41,
        time: [13, 15],
        body: `My charger died. Replacement was \u20AC79, receipt is in the expense tool.

Felix`,
      },
    ],
  },
  {
    subject: 'Interview scheduling: Dev Malhotra and Yusuf Demir',
    mail: [
      {
        from: 'astrid',
        to: ['omar', 'hana'],
        day: 1,
        time: [11, 0],
        body: `Two backend loops coming up: Dev Malhotra on Wednesday next week, then Yusuf Demir that Friday. Omar leads both.

Hana, would you shadow Dev's? It's a good way to learn the loop, and next quarter you'll run one yourself. Sit in, take notes, and write your own scorecard so we can compare.

Astrid`,
      },
    ],
  },
  {
    subject: 'Review request: rate limiter for the cache API',
    mail: [
      {
        from: 'june',
        to: ['omar'],
        cc: ['astrid'],
        day: 16,
        time: [12, 30],
        body: `Omar, could you review the rate limiter? It's a token bucket per API key, stored in Redis, with 100 requests a second sustained and a burst of 500.

I'd especially like your eye on the burst settings. A cold build on a big monorepo can fire a few thousand lookups in its first seconds, and I don't want the limiter to be what makes cold builds slow.

June`,
      },
    ],
  },
  {
    subject: 'Saltmarsh deposit paid',
    mail: [
      {
        from: 'lucia',
        to: ['astrid'],
        day: 9,
        time: [8, 45],
        body: `Paid the 30% deposit to Saltmarsh Lodge, \u20AC2,940. Expense report is in for your approval. The balance of \u20AC6,860 is due two weeks before we arrive.

Lucía`,
      },
    ],
  },
  {
    subject: 'Question on the S3 multipart retry change',
    mail: [
      {
        from: 'tomas',
        to: ['felix'],
        cc: ['astrid'],
        day: 1,
        time: [14, 0],
        body: `Felix, does the multipart retry change affect upload progress events? The dashboard shows a stalled bar when a part retries, and on a slow link it sits there long enough that people assume the upload died.

If the agent emitted a retry event, I could show "retrying part 3 of 12" instead.

Tomás`,
      },
    ],
  },
];

//
// Automated mail.
//

type Automated = {
  readonly sender: Actor.Actor;
  readonly subject: string;
  readonly body: string;
  readonly promotion?: boolean;
  readonly listUnsubscribe?: string;
};

const sender = (name: string, email: string): Actor.Actor => ({ role: 'user', name, email });

const GITHUB = sender('GitHub', 'notifications@github.com');
const LINEAR = sender('Linear', 'notifications@linear.app');
const POSTHOG = sender('PostHog', 'alerts@posthog.com');
const STRIPE = sender('Stripe', 'notifications@stripe.com');
const CLOUDFLARE_BILLING = sender('Cloudflare', 'noreply@notify.cloudflare.com');
const CACHE_LINE = sender('Cache Line', 'editor@cacheline.news');
const MONOREPO_NOTES = sender('Monorepo Notes', 'hello@monoreponotes.dev');

/** GitHub handle for a teammate: first name, accents stripped. */
const loginOf = (person: Person.Person): string =>
  (person.fullName ?? '')
    .split(' ')[0]
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase();

const GITHUB_FOOTER = `Reply to this email directly, view it on GitHub, or unsubscribe.
You are receiving this because your review was requested.`;

const REVIEW_REQUESTS = [
  {
    day: 50,
    author: 'kofi',
    title: 'Bump setup-cairn to Node 24',
    summary: 'Actions is deprecating Node 20 runners. Moves the action to node24 and drops the polyfill for fetch.',
  },
  {
    day: 33,
    author: 'omar',
    title: 'Add runner image digest to cache key',
    summary:
      'Fixes the Okapi collision: builds on different runner images computed the same key. Behind the image_digest_key flag until we turn it on per org.',
  },
  {
    day: 30,
    author: 'june',
    title: 'SCIM: revoke API tokens on deactivation',
    summary:
      'Blocks Northpine prod. Deactivation now revokes tokens and ends sessions in one transaction, with an audit entry per token.',
  },
  {
    day: 30,
    author: 'anika',
    title: 'Reject writes with a mismatched content hash',
    summary:
      'Server half of the Okapi fix. A write to an existing key must match the stored hash; otherwise it returns 409 and emits cairn.cache.write.hash_mismatch.',
  },
  {
    day: 29,
    author: 'kofi',
    title: 'Docs: self-hosted runner cache volumes',
    summary: 'Needed for the GitHub partner review. Covers ephemeral runners, warm volumes and runners behind a proxy.',
  },
  {
    day: 23,
    author: 'june',
    title: 'Meter cache storage for usage-based billing',
    summary:
      'Sends one meter event per customer per hour with an idempotency identifier. Test mode only until migration.',
  },
  {
    day: 19,
    author: 'anika',
    title: 'Build cache nodes for arm64',
    summary:
      'Adds arm64 images and an arm64 leg to the CI matrix. Benchmarks are in the description of the linked issue.',
  },
  {
    day: 16,
    author: 'june',
    title: 'Token-bucket rate limiter for the cache API',
    summary:
      'Per API key, in Redis. 100 requests a second sustained, burst of 500. Burst settings need a second opinion.',
  },
  {
    day: 12,
    author: 'hana',
    title: 'Fix flaky eviction test under parallel load',
    summary:
      'The test checked the budget before the eviction worker caught up. It now waits on the worker instead of sleeping.',
  },
  {
    day: 8,
    author: 'tomas',
    title: 'Dashboard: setup checklist for empty workspaces',
    summary: "From Ben's new designs. Three steps that tick off as the agent reports its first events.",
  },
  {
    day: 7,
    author: 'anika',
    title: 'Send hash-mismatch alerts to customers',
    summary:
      'Okapi action item. Org admins can register a webhook (PagerDuty Events API v2 format) and an email address for hash-mismatch alerts.',
  },
  {
    day: 5,
    author: 'felix',
    title: 'Retry S3 multipart uploads on 503',
    summary:
      'Retries a failed part up to five times with exponential backoff and jitter, instead of failing the upload.',
  },
] as const;

const CI_FAILURES = [
  {
    workflow: 'CI',
    branch: 'main',
    job: 'test (ubuntu-24.04)',
    error: 'concurrent_eviction_respects_budget timed out after 120s',
  },
  { workflow: 'CI', branch: 'renovate/node-24', job: 'lint', error: 'oxlint: 3 errors in packages/agent' },
  {
    workflow: 'Release',
    branch: 'main',
    job: 'publish-images',
    error: 'Process completed with exit code 1: registry returned 429 Too Many Requests',
  },
  {
    workflow: 'CI',
    branch: 'dependabot/cargo/tokio-1.47',
    job: 'test (macos-15)',
    error: 'cache_server::shutdown hung for 60s waiting on the listener',
  },
  { workflow: 'CI', branch: 'main', job: 'e2e', error: 'dashboard login screenshot mismatch (2.1% diff)' },
  { workflow: 'Nightly', branch: 'main', job: 'bench', error: 'p99 read latency regressed 14% against baseline' },
  { workflow: 'CI', branch: 'main', job: 'build (arm64)', error: 'linker could not find -lzstd' },
  { workflow: 'Nightly', branch: 'main', job: 'soak', error: 'cache-node RSS above 6 GiB after 4 hours' },
] as const;

const POSTHOG_ALERTS = [
  {
    day: 44,
    time: [3, 10],
    title: '[Warning] Disk usage above 80% on cache-node-07',
    insight: 'cache-node disk usage, cache-node-07',
    threshold: 'above 80%',
    value: '83.4%',
    message: 'Check the eviction backlog before expanding the volume. Runbook: Disk pressure on a cache node.',
  },
  {
    day: 35,
    time: [7, 20],
    title: '[Firing] cairn-cache p99 read latency above 250 ms in the EU',
    insight: 'cairn-cache p99 read latency, EU',
    threshold: 'above 250 ms',
    value: '412 ms',
    message: 'Reads are slow for customers in the EU. Check node CPU and the storage read path.',
  },
  {
    day: 35,
    time: [10, 45],
    title: '[Resolved] cairn-cache p99 read latency above 250 ms in the EU',
    insight: 'cairn-cache p99 read latency, EU',
    threshold: 'above 250 ms',
    value: '138 ms',
    message: 'Read latency is back under threshold.',
  },
  {
    day: 27,
    time: [6, 5],
    title: '[Firing] Hash-mismatch writes detected on cairn-cache',
    insight: 'cairn-cache hash-mismatch writes',
    threshold: 'above 0 in 5 minutes',
    value: '2',
    message: 'A write to an existing key carried different content and was rejected. Check which org and runner image.',
  },
  {
    day: 17,
    time: [14, 5],
    title: '[Firing] cairn-api 5xx rate above 1% in the US',
    insight: 'cairn-api 5xx rate, US',
    threshold: 'above 1%',
    value: '3.2%',
    message: 'API errors are elevated in the US. Check for a single key retrying in a loop before scaling.',
  },
  {
    day: 17,
    time: [14, 50],
    title: '[Resolved] cairn-api 5xx rate above 1% in the US',
    insight: 'cairn-api 5xx rate, US',
    threshold: 'above 1%',
    value: '0.4%',
    message: 'API error rate is back under threshold.',
  },
  {
    day: 6,
    time: [11, 30],
    title: '[Warning] S3 multipart upload retries above baseline',
    insight: 'Storage multipart upload retries',
    threshold: 'more than 2 standard deviations above the 7-day mean',
    value: '47 retries/min',
    message: 'Uploads are retrying more than usual. Usually S3 throttling in one region; check 503 counts per bucket.',
  },
] as const;

const BACKLOG = [
  'Customer-facing hash-mismatch alerts',
  'Dedicated region for Northpine',
  'R2 read tier spike',
  'Usage meter backfill for annual plans',
  'Setup checklist for empty workspaces',
  'Perforce support in the agent',
  'Eviction metrics in the dashboard',
] as const;

type Issue = { readonly headline: string; readonly summary: string; readonly also: string };

const NEWSLETTERS: Array<{
  readonly from: Actor.Actor;
  readonly site: string;
  readonly unsubscribe: string;
  readonly issues: Issue[];
}> = [
  {
    from: CACHE_LINE,
    site: 'https://cacheline.news',
    unsubscribe: '<https://cacheline.news/unsubscribe>, <mailto:unsubscribe@cacheline.news>',
    issues: [
      {
        headline: '#112: Content addressing is not enough',
        summary:
          'Why hashing declared inputs misses the toolchain, and three ways teams put the compiler and system image into the key without killing their hit rate.',
        also: 'A reader asks whether to cache test results or only build outputs.',
      },
      {
        headline: '#113: Remote execution on a budget',
        summary:
          'Running Bazel remote execution on spot instances without losing builds: checkpointing, retries, and what to do when half the pool disappears.',
        also: 'Two job posts, both for build infrastructure engineers in Europe.',
      },
      {
        headline: '#114: The hermeticity tax',
        summary:
          'A survey of 40 teams on what full hermeticity costs in engineering time and what it saves in cache hits and debugging.',
        also: 'Correction: last issue overstated spot interruption rates in US regions.',
      },
      {
        headline: '#115: Cache poisoning, revisited',
        summary:
          'Two public incidents this quarter and the write policies that stop them: compare-and-set commits, digest-derived paths, and verifying on restore.',
        also: 'A short guide to alerting customers when their own builds are not reproducible.',
      },
    ],
  },
  {
    from: MONOREPO_NOTES,
    site: 'https://monoreponotes.dev',
    unsubscribe: '<https://monoreponotes.dev/u/fieldstone>',
    issues: [
      {
        headline: '#57: Sparse checkouts at scale',
        summary:
          'How a 3,000-engineer repo cut clone time from 40 minutes to 90 seconds with sparse checkouts and a partial clone filter.',
        also: 'Reader survey results: 61% of you still run CI on a single long-lived branch.',
      },
      {
        headline: '#58: Ownership files that stay true',
        summary:
          'Generating CODEOWNERS from the build graph instead of by hand, so ownership follows the code when directories move.',
        also: 'Tooling notes on three new affected-target detectors.',
      },
      {
        headline: '#59: Game studios and Perforce',
        summary:
          'Why asset-heavy teams stay on Perforce, what that means for CI, and how studios cache cooked assets without a git commit to key on.',
        also: 'An interview with a build lead at a mid-sized studio on shader compile times.',
      },
      {
        headline: '#60: Affected-target detection',
        summary:
          'Comparing four tools that decide what to test on a pull request, measured on the same repo over a month of real changes.',
        also: 'A reader asks how to stop a monorepo CI bill from growing faster than headcount.',
      },
    ],
  },
];

type Placed = Automated & { readonly day: number; readonly time: readonly [number, number] };

/**
 * 50 automated messages. Most land on a fixed cadence; CI failures fill any weekday the other mail
 * left empty, so every weekday has mail.
 */
const makeAutomated = (clock: Clock, people: Directory, coveredDays: Set<number>): Placed[] => {
  const random = makeRandom(0xf1e1d);
  const hourOf = (): readonly [number, number] => [random.int(6, 15), random.int(0, 59)];
  const daysOn = (weekday: number, count: number) => {
    const days: number[] = [];
    for (let day = 1; days.length < count; day++) {
      if ((((clock.now.getUTCDay() - day) % 7) + 7) % 7 === weekday) {
        days.push(day);
      }
    }
    return days;
  };

  const placed: Placed[] = [];

  for (const [index, request] of REVIEW_REQUESTS.entries()) {
    const number = 1401 + index * 7 + random.int(0, 5);
    const files = random.int(2, 14);
    const commits = random.int(1, 6);
    const url = `https://github.com/alien-labs/cairn/pull/${number}`;
    placed.push({
      sender: GITHUB,
      day: request.day,
      time: hourOf(),
      subject: `[alien-labs/cairn] ${request.title} (PR #${number})`,
      body: `@${loginOf(people[request.author])} requested your review on: alien-labs/cairn#${number} ${request.title}.

${request.summary}

You can view, comment on, or merge this pull request online at:

  ${url}

Commit Summary

  ${commits} ${commits === 1 ? 'commit' : 'commits'} by ${people[request.author].fullName}

File Changes (${files} files)

  +${random.int(20, 480)} -${random.int(5, 160)}

Patch Links:

  ${url}.patch
  ${url}.diff

${GITHUB_FOOTER}`,
    });
  }

  for (const alert of POSTHOG_ALERTS) {
    const alertId = random.int(100_000, 999_999);
    placed.push({
      sender: POSTHOG,
      day: alert.day,
      time: alert.time,
      subject: alert.title,
      body: `${alert.title}

${alert.message}

Insight: ${alert.insight}
Current value: ${alert.value}
Threshold: ${alert.threshold}
Project: cairn-prod

Notified: #cairn-alerts on Slack, Cairn on-call

View alert: https://eu.posthog.com/project/48213/alerts/${alertId}
Edit alert: https://eu.posthog.com/project/48213/alerts/${alertId}/edit`,
    });
  }

  for (const [index, day] of daysOn(1, 8).entries()) {
    const cycle = 48 - index;
    const [first, second] = [random.pick(BACKLOG), random.pick(BACKLOG)];
    const completed = random.int(9, 24);
    const inProgress = random.int(4, 11);
    placed.push({
      sender: LINEAR,
      day,
      time: [6, 0],
      subject: `Cairn weekly digest: cycle ${cycle}`,
      body: `Here's your weekly summary for Cairn (CAI).

Cycle ${cycle}
Completed: ${completed} issues
In progress: ${inProgress}
New: ${random.int(5, 15)}
Scope completed: ${Math.round((completed / (completed + inProgress)) * 100)}%

Top of the backlog:
- ${first}
- ${first === second ? BACKLOG[(BACKLOG.indexOf(first) + 1) % BACKLOG.length] : second}

Assigned to you: ${random.int(1, 4)} open, ${random.int(0, 2)} due this week.

View cycle: https://linear.app/alien-labs/team/CAI/cycle/${cycle}

You're receiving the weekly digest for teams you're a member of. Change this in Settings > Notifications.`,
    });
  }

  for (const [index, day] of daysOn(4, 8).entries()) {
    const newsletter = NEWSLETTERS[index % 2];
    const issue = newsletter.issues[3 - Math.floor(index / 2)];
    const number = issue.headline.slice(1, issue.headline.indexOf(':'));
    placed.push({
      sender: newsletter.from,
      day,
      time: [7, 30],
      subject: `${newsletter.from.name} ${issue.headline}`,
      body: `${newsletter.from.name}, issue ${number}

${issue.summary}

Also this issue: ${issue.also}

Read it on the web: ${newsletter.site}/${number}

You're receiving this because you subscribed at ${newsletter.from.email?.split('@')[1]}. Unsubscribe with one click from the link in the header, or at ${newsletter.site}.`,
      promotion: true,
      listUnsubscribe: newsletter.unsubscribe,
    });
  }

  for (const day of daysOn(5, 5)) {
    const amount = `${random.int(18, 42)},${String(random.int(0, 999)).padStart(3, '0')}.${String(random.int(0, 99)).padStart(2, '0')}`;
    const payout = `po_1Q${random.int(0x1000000, 0xfffffff).toString(16).toUpperCase()}`;
    placed.push({
      sender: STRIPE,
      day,
      time: [9, 15],
      subject: `Your payout of $${amount} is on the way`,
      body: `Your payout of $${amount} is on the way

A payout of $${amount} USD to your Alien Labs bank account ending in 4821 is expected to arrive in 2 business days.

Payout ID: ${payout}
Includes: ${random.int(120, 190)} charges, ${random.int(0, 4)} refunds, less Stripe fees

View it in the Dashboard: https://dashboard.stripe.com/payouts/${payout}

You're receiving this email because you're an administrator of the Alien Labs Stripe account.`,
    });
  }

  placed.push(
    {
      sender: CLOUDFLARE_BILLING,
      day: 60,
      time: [4, 0],
      subject: 'Cloudflare billing: cairn-prod-monthly is forecast to exceed 100% of budget',
      body: `Hello,

You asked us to notify you when forecast usage on the Alien Labs account passes your cairn-prod-monthly budget of $18,000.00 for the current billing period. Forecast usage is now $18,940.12. Details are below and in the Billing section of the Cloudflare dashboard.

Budget name: cairn-prod-monthly
Budgeted amount: $18,000.00
Notification type: Forecast usage
Threshold: > $18,000.00 (100%)
Forecast usage: $18,940.12
Top product: Containers

https://dash.cloudflare.com/?to=/:account/billing`,
    },
    {
      sender: CLOUDFLARE_BILLING,
      day: 25,
      time: [4, 0],
      subject: 'Cloudflare billing: cairn-prod-monthly has passed 80% of budget',
      body: `Hello,

You asked us to notify you when actual usage on the Alien Labs account passes 80% of your cairn-prod-monthly budget for the current billing period. Usage to date is $14,612.55. Details are below and in the Billing section of the Cloudflare dashboard.

Budget name: cairn-prod-monthly
Budgeted amount: $18,000.00
Notification type: Actual usage
Threshold: > $14,400.00 (80%)
Usage to date: $14,612.55
Top product: R2 (Class B operations)

https://dash.cloudflare.com/?to=/:account/billing`,
    },
  );

  for (const { day } of placed) {
    coveredDays.add(day);
  }
  const uncovered: number[] = [];
  for (let day = 0; day <= 60; day++) {
    if (isWeekday(clock, -day) && !coveredDays.has(day)) {
      uncovered.push(day);
    }
  }
  for (const [index, failure] of CI_FAILURES.entries()) {
    const day = index < uncovered.length ? uncovered[index] : random.int(1, 59);
    const sha = random.int(0x1000000, 0xfffffff).toString(16);
    const minutes = random.int(2, 38);
    placed.push({
      sender: GITHUB,
      day,
      time: hourOf(),
      subject: `[alien-labs/cairn] Run failed: ${failure.workflow} - ${failure.branch} (${sha})`,
      body: `${failure.workflow}: Some jobs were not successful

Workflow: ${failure.workflow}
Branch: ${failure.branch}
Commit: ${sha}

${failure.job}
Failed in ${minutes} minutes and ${random.int(1, 59)} seconds

Annotations
1 error
${failure.error}

View workflow run: https://github.com/alien-labs/cairn/actions/runs/${random.int(10_000_000, 99_999_999)}

You are receiving this because this workflow ran on a branch in alien-labs/cairn you watch.`,
    });
  }

  return placed;
};

//
// Summaries.
//

const SUMMARIES: Partial<Record<ThreadKey, string>> = {
  northpineSso:
    'Northpine is moving every vendor behind Okta. June shipped SAML and SCIM to staging; Marcus found that deactivated users kept their API tokens, which blocked prod. June fixed it within a week and Northpine is **live in production**.',
  meridianSecurity:
    "Meridian's paid plan waited on their vendor security review. Anika documented that no PHI reaches Cairn, so no BAA is needed; Ted's follow-ups on SOC 2 (Type I, report due within weeks) and bucket access were answered. **Kenji signed off** after the review call.",
  okapiIncident:
    "Two Okapi builds on different runner images shared a cache key and one overwrote the other. Root cause: the key ignored the runner image. Fixes: image digest in the key and rejecting hash-mismatched writes, both in production. Nadia asked for the alert to reach Okapi's on-call too; customer alerts ship with 1.8 as a PagerDuty webhook.",
  stripeBilling:
    'June is moving Cairn to per-seat plus metered storage on Stripe. Existing subscriptions switch without proration. A working session fixed prepay credits on the metered line; the migration runs over two weeks.',
  offsite:
    'Saltmarsh Lodge hosts the Q4 offsite: ten people, three nights, full board, \u20AC9,800. Deposit paid. Two tables of five in the Dune Room, and the terrace for the second afternoon. Final headcount sent.',
};

//
// Build.
//

export type MailResult = { readonly mailbox: Mailbox.Mailbox; readonly threads: Threads };

/**
 * Astrid's inbox: 188 messages in 103 threads over two months, in the mailbox's feed, with system
 * tags in its tag index, five thread summaries and ten summaries of the newest messages in its
 * annotations feed, and the seven extracted contacts recorded in `mailbox.extracted` as
 * `ExtractMessage` records them.
 */
export const makeMail = (people: Directory, agents: Agents): Make<MailResult> =>
  Effect.gen(function* () {
    const clock = yield* SampleSpace.Clock;
    const mailbox = yield* Database.add(Mailbox.make({ name: 'Inbox' }));
    const index = mailbox.tags.target;
    const feed = mailbox.feed.target;
    if (!index || !feed) {
      return yield* Effect.fail(new SampleSpace.SampleSpaceError({ context: { reason: 'mailbox-incomplete' } }));
    }

    const scribe: Actor.Actor = {
      role: 'assistant',
      name: agents.scribe.name,
      email: 'scribe@agents.alienlabs.io',
      identityDid: agents.scribe.did,
    };
    const actorFor = (who: Who | 'scribe'): Actor.Actor => (who === 'scribe' ? scribe : personActor(people[who]));
    const addressFor = (who: Who | 'scribe'): string =>
      who === 'scribe' ? `Scribe <${scribe.email}>` : address(people[who]);
    const astrid = address(people.astrid);

    const entries: Array<{ message: Message.Message; tags: SystemTags.SystemTagId[] }> = [];
    const summarized: Array<{ message: Message.Message; text: string }> = [];
    const threads: Threads = {
      northpineSso: [],
      northpineRenewal: [],
      meridianSecurity: [],
      okapiIncident: [],
      brightwaterIntro: [],
      halcyonInbound: [],
      kestrelInbound: [],
      vantageDiscovery: [],
      vantageResidency: [],
      meridianProposal: [],
      tidewaterSecurity: [],
      tidewaterMsa: [],
      lumenSigned: [],
      lumenRollout: [],
      pallasDecision: [],
      corvidEvaluation: [],
      larkspurDemo: [],
      aldermoorProposal: [],
      stripeBilling: [],
      cloudflareCredits: [],
      cloudflareR2: [],
      githubPartner: [],
      offsite: [],
      hanaOnboarding: [],
      releaseNotes: [],
      weeklyUpdate: [],
    };

    const covered = new Set<number>();
    for (const thread of [
      ...CUSTOMER_THREADS,
      ...PIPELINE_THREADS,
      ...VENDOR_THREADS,
      ...INTERNAL_THREADS,
      ...BACKGROUND_THREADS,
    ]) {
      const threadId = threadIdFor(thread.subject);
      let parent: Message.Message | undefined;
      for (const mail of thread.mail) {
        covered.add(mail.day);
        const subject = parent ? `Re: ${thread.subject}` : thread.subject;
        const blob = mail.attachment
          ? yield* Database.add(
              Blob.make({
                type: mail.attachment.type,
                size: new TextEncoder().encode(mail.attachment.text).byteLength,
                data: Blob.inlineData(new TextEncoder().encode(mail.attachment.text)),
              }),
            )
          : undefined;
        const message = Message.make({
          created: at(clock, -mail.day, mail.time[0], mail.time[1]),
          sender: actorFor(mail.from),
          blocks: [textBlock(mail.body)],
          threadId,
          ...(parent ? { parentMessage: parent.id } : {}),
          ...(blob && mail.attachment ? { attachments: [{ name: mail.attachment.name, ref: Ref.make(blob) }] } : {}),
          properties: {
            subject,
            threadId,
            to: mail.to.map(addressFor).join(', '),
            ...(mail.cc?.length ? { cc: mail.cc.map(addressFor).join(', ') } : {}),
          },
        });
        parent = message;
        const summary = MESSAGE_SUMMARIES[messageSummaryKey(thread.subject, mail.from, mail.day)];
        if (summary) {
          summarized.push({ message, text: summary });
        }
        entries.push({
          message,
          tags: [
            ...(thread.archived ? [] : (['inbox'] as const)),
            ...(mail.from === 'astrid' ? (['sent'] as const) : []),
            ...(thread.customer ? (['important'] as const) : []),
            ...(mail.starred ? (['starred'] as const) : []),
          ],
        });
        if (thread.key) {
          threads[thread.key].push(message);
        }
      }
    }

    const automated = makeAutomated(clock, people, covered).sort((left, right) => right.day - left.day);
    for (const [position, item] of automated.entries()) {
      const threadId = threadIdFor(item.subject);
      entries.push({
        message: Message.make({
          created: at(clock, -item.day, item.time[0], item.time[1]),
          sender: item.sender,
          blocks: [textBlock(item.body)],
          threadId,
          properties: {
            subject: item.subject,
            threadId,
            to: astrid,
            ...(item.listUnsubscribe ? { listUnsubscribe: item.listUnsubscribe } : {}),
          },
        }),
        // The oldest automated mail is archived, with the settled background threads, to make 30.
        tags: [...(position < 15 ? [] : (['inbox'] as const)), item.promotion ? 'promotions' : 'updates'],
      });
    }

    entries.sort((left, right) => left.message.created.localeCompare(right.message.created));
    const messages = entries.map(({ message }) => message);

    yield* SampleSpace.tagBatch(
      entries.flatMap(({ message, tags }) => tags.map((key) => ({ object: message, key }))),
      { index, resolve: (db, key) => SystemTags.findOrCreateSystemTag(db, key as SystemTags.SystemTagId) },
    );

    Obj.update(mailbox, (mailbox) => {
      mailbox.subscriptions = Mailbox.deriveSubscriptions(messages);
    });

    for (const key of EXTRACTED) {
      const email = people[key].emails?.[0]?.value;
      const first = messages.find((message) => message.sender.email === email);
      if (first) {
        Mailbox.recordExtraction(mailbox, first.id, [people[key].id]);
      }
    }

    const summaries = [
      ...Object.entries(SUMMARIES).map(([key, text]) => {
        const thread = threads[key as ThreadKey];
        const newest = thread[thread.length - 1];
        return Mailbox.makeSummary({
          message: newest,
          text,
          created: new Date(Date.parse(newest.created) + 60 * 60 * 1000).toISOString(),
        });
      }),
      // Summarized shortly after arrival, so even the newest is dated before the reference time.
      ...summarized.map(({ message, text }) =>
        Mailbox.makeSummary({
          message,
          text,
          created: new Date(Date.parse(message.created) + 15 * 60 * 1000).toISOString(),
        }),
      ),
    ];

    const { db } = yield* Database.Service;
    yield* SampleSpace.appendToFeed(feed, messages);
    yield* SampleSpace.appendToFeed(Mailbox.findOrCreateAnnotations(mailbox, db), summaries);

    return { mailbox, threads } satisfies MailResult;
  });
