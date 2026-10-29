//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, EID, type Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { trim } from '@dxos/util';

import { type InboxCrmLinks } from './projects.ts';

export type ArtifactKey = 'cacheDesign' | 'billingPlan' | 'soc2Policies' | 'offsiteAgenda' | 'releaseNotes';

export type Artifacts = Record<ArtifactKey, Markdown.Document>;

const link = (label: string, object: Obj.Unknown) => `[${label}](${EID.make({ entityId: object.id })})`;

const embed = (label: string, object: Obj.Unknown) => `![${label}](${EID.make({ entityId: object.id })})`;

const CACHE_DESIGN = trim`
  # Remote cache v2 design

  Owner: Omar Haddad. Status: accepted, shipping in Cairn 1.8.

  ## Why

  v1 keys every blob by the action key the client sends. Two builds that produce identical outputs store two copies, and two writers racing on one key can leave the index pointing at the wrong blob. The SQLite index also tops out near 4k writes a second, which our largest tenant already reaches on a Monday morning.

  ## Storage

  - Blobs are stored under the BLAKE3 digest of their bytes. The v1 action key becomes an alias row that resolves to a digest, kept until 1.9.
  - Blobs over 64 MB upload in parts. S3 is the default backend; R2 can be chosen per tenant.

  ## Index

  - 256 shards on the KV store, chosen by the first byte of the digest.
  - Every index write is a compare-and-set on the digest. The losing writer gets a 409 and treats it as a hit.
  - A week of dual writes to SQLite, then a resumable backfill.

  ## Edge tier

  - Eviction by bytes, not entry count, weighted by hits over the last 24 hours.
  - Replaying the September edge trace: hit rate 71% before, 83% after, same disk.

  ## Downloads

  - Blobs over 8 MB are served by a 302 to a signed storage URL, bound to tenant and digest, valid 15 minutes.

  ## Rollout

  1. Three design partners on v2 (milestone: Cache v2 in beta).
  2. Every tenant on v2 with 1.8 (milestone: 1.8 shipped).
  3. Remove the v1 alias table in 1.9.
`;

const BILLING_PLAN = trim`
  # Billing migration plan

  Owner: June Okonkwo. From three flat tiers to usage pricing on Stripe.

  ## Prices

  | Unit | Price |
  | --- | --- |
  | GB-month stored | $0.09 |
  | 1,000 cache hits | $0.04 |
  | Included each month | 50 GB and 250,000 hits |

  At these prices the median tenant pays within 6% of what it pays today.

  ## Timeline

  1. Metering events in production, queued locally so a Stripe outage delays usage but never loses it.
  2. October in shadow mode: a usage invoice is computed next to every real one and nobody is charged.
  3. 30 days' notice to every account owner, and a call for the five largest accounts.
  4. The first real usage invoices go out with the November cycle.

  ## Rules

  - One Stripe customer per organization and one usage subscription per tenant.
  - Every webhook handler is idempotent on the Stripe event id.
  - A tenant whose bill would move by more than 25% gets a personal email before the switch.
  - Prices live in Stripe and in this document, never in code.
`;

const SOC2_POLICIES = trim`
  # SOC 2 policy set

  Drafted by Scribe from how Alien Labs works today; each policy names its owner. Gaps are flagged where we found them rather than papered over.

  ## Access control (approved, owner Anika Rao)

  Production access is granted through the cloud console groups, by request in the access channel, approved by the engineering manager. Access is reviewed every quarter. **Gaps:** no written offboarding checklist; two engineers hold standing production admin.

  ## Incident response (approved, owner Anika Rao)

  Three severities. SEV1 pages the on-call engineer and the engineering manager; affected customers hear from us within 24 hours; every SEV1 and SEV2 gets a postmortem within five business days. Worked example: the Okapi cache-corruption incident.

  ## Change management (approved, owner Omar Haddad)

  Every production change is a reviewed pull request with green CI. An emergency change may merge first, with a review within one business day, recorded in the incident.

  ## Vendor management (in review, owner Anika Rao)

  Four vendors touch customer data: Cloudflare, GitHub, Stripe and Google Workspace. Each is reviewed once a year against its own SOC 2 report.

  ## Data retention (draft, owner Anika Rao)

  Build artifacts of a deleted tenant are kept 30 days, then hard-deleted, and the deletion email says so. Logs are kept 90 days. Billing records: to be decided with June.
`;

const RELEASE_NOTES = trim`
  # Cairn 1.8 release notes (draft)

  Drafted by Scribe for Lucía's review.

  **Cairn 1.8 ships the v2 remote cache.** Identical outputs are now stored once, so most teams store about a third less. Nothing changes for you unless you pin the cache protocol version.

  ## New

  - Content-addressed storage: every artifact is keyed by its BLAKE3 digest.
  - A sharded index that takes about five times the write load of 1.7.
  - _In review:_ large downloads come straight from storage through a signed URL.
  - _In review:_ the edge tier evicts by size and recent hits, not entry count.
  - \`cairn\` backs off on 429 and 503 and falls back to a local build instead of hammering a busy server.

  ## Fixed

  - Two builds writing the same cache key at the same moment can no longer leave a corrupt entry.

  ## Upgrading

  Read the migration guide before upgrading if you pin the protocol. Everyone else: upgrade the CLI and you are done.
`;

const offsiteAgenda = (links: InboxCrmLinks | undefined) => {
  const lodge = links ? link('Saltmarsh Lodge', links.orgs.saltmarsh) : 'Saltmarsh Lodge';
  const wren = links ? link('Wren Calloway', links.people.wren) : "the lodge's events coordinator";
  const event = links?.events.offsite[0];
  return trim`
    # Offsite agenda

    Three days at ${lodge}, all ten of us. Questions about rooms and food go to ${wren}.

    ${event ? embed('Team offsite', event) : ''}

    ## Day one: arrive and look back

    - Arrive by 15:00. Toronto flies overnight, Lisbon takes the morning flight.
    - 16:00 What 2026 taught us: each person brings one thing that worked and one that did not.
    - 19:30 Dinner at the lodge.

    ## Day two: 2027

    - 09:00 Roadmap: cache, billing, compliance, and what we stop doing.
    - 14:00 Afternoon off. Kayaks if it is dry, the coast walk if it is not.
    - 18:00 Customer stories from Lucía and Kofi.

    ## Day three: how we work

    - 09:00 Agents on the team: what Builder, Reviewer, Triage and Scribe should own next year.
    - 11:00 On-call and review load, with Anika.
    - 13:00 Leave for the airport.

    ## Budget

    Lodge, three nights full board: ${'\u20AC'}14,200. Flights: about ${'\u20AC'}6,800. Activities: ${'\u20AC'}600.
  `;
};

/** The five project artifacts. The offsite agenda links its venue and contact when inbox-crm is present. */
export const makeDocs = Effect.fnUntraced(function* ({ inboxCrm }: { readonly inboxCrm?: InboxCrmLinks }) {
  const docs: Artifacts = {
    cacheDesign: Markdown.make({ name: 'Remote cache v2 design', content: CACHE_DESIGN }),
    billingPlan: Markdown.make({ name: 'Billing migration plan', content: BILLING_PLAN }),
    soc2Policies: Markdown.make({ name: 'SOC 2 policy set', content: SOC2_POLICIES }),
    offsiteAgenda: Markdown.make({ name: 'Offsite agenda', content: offsiteAgenda(inboxCrm) }),
    releaseNotes: Markdown.make({ name: 'Cairn 1.8 release notes', content: RELEASE_NOTES }),
  };
  for (const doc of Object.values(docs)) {
    yield* Database.add(doc);
  }
  return docs;
});
