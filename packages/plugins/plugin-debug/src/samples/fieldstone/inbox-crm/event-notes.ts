//
// Copyright 2026 DXOS.org
//

/** Key of an event's long-form notes: its title and its day relative to the reference date. */
export const eventNoteKey = (title: string, offset: number): string => `${title}@${offset}`;

/**
 * Meeting notes for the ten most recent events before the reference date, keyed by {@link eventNoteKey}.
 * Recurring series share a title, so the day picks the occurrence; these replace its short agenda.
 */
export const EVENT_NOTES: Record<string, string> = {
  [eventNoteKey('Astrid / Omar 1:1', 0)]: `## Attendees

- Astrid Holm
- Omar Haddad

## Agenda

1. Cairn 1.8 release on Friday
2. Cloudflare R2 as the read tier
3. Hiring: the Dev Malhotra and Yusuf Demir loops
4. Hana's ramp-up
5. Vantage technical deep dive

## Discussion

### Cairn 1.8

- Omar is confident in the runner-image digest in the cache key. Staging has run on it for a week with no hash-mismatch alerts that were not explained.
- The cold build after upgrade is the one real customer-facing risk. The upgrade note now sits under the highlights, as Astrid asked the Scribe.
- Okapi is credited for the report in the release notes; Nadia agreed.

### R2 read tier

- Felix's cost model holds: about 1.9 billion reads a month, around 60% cheaper than S3 egress even with Class B operation costs. S3 stays the system of record.
- The last Cloudflare budget alert named R2 Class B operations as the top product, so small, hot artifacts are where the request count comes from. Omar wants to batch lookups for small artifacts before the enterprise commit is sized.
- The pricing call with Inês is on Tuesday after the release; Omar and Felix both join.

### Hiring

- Omar leads both backend loops next week. Hana shadows Dev's loop and writes her own scorecard.
- Lena Vogt starts in January, so Omar wants one of these hires on the cache engine and one on the API side with June.

### Hana

- Hana's flaky eviction test fix merged in her first week. Omar thinks she is ready for a real 1.9 task and suggested the warm-cache command.

### Vantage

- Claire wants US-only storage with a shared control plane. Omar will bring a diagram of what crosses the region boundary; Anika covers access.

## Decisions

- No new cache-key changes go into 1.8 after today.
- Hana takes the warm-cache command for 1.9, with Omar as reviewer.

## Action items

- [x] Move the upgrade note under the highlights in the 1.8 notes (Astrid)
- [ ] Prepare the batched small-artifact lookup estimate before the R2 call (Omar)
- [ ] Send Hana the interview loop guide and scorecard template (Omar)
- [ ] Draw the US-only data flow for the Vantage deep dive (Omar)
- [ ] Open the 1.9 warm-cache command issue in alien-labs/cairn and assign Hana (Astrid)
`,

  [eventNoteKey('Team sync', -2)]: `## Attendees

- Astrid Holm
- Omar Haddad
- June Okonkwo
- Anika Rao
- Lucía Ferreira

## Agenda

1. Demo: size-aware eviction on the edge tier
2. Cairn 1.8 go/no-go for Friday
3. Customer roundup
4. Billing migration
5. Blockers

## Discussion

### Size-aware eviction demo

- Omar showed eviction bounded by bytes rather than entry count on a staging node loaded with Northpine-sized 2 GB simulation bundles. The node stayed under its memory budget; the old count bound would have overrun it.
- Anika wants the eviction backlog on the cache-node dashboard so a disk page shows whether eviction is keeping up.

### Cairn 1.8

- The Scribe's release notes draft landed this morning from 31 merged pull requests and 18 closed issues. Astrid is reviewing it today.
- Everything in the train is merged: runner-image cache keys, rejected hash-mismatch writes with customer alerts, SCIM token revocation and the verified setup-cairn action.
- Felix's S3 multipart retry fix is the last item in review; Anika wants it in so the retry rate drops back to baseline.

### Customers

- Meridian: Kenji signed off; Lucía sends the paid-plan proposal today, 60 seats on Enterprise with the SOC 2 Type I report within 60 days.
- Brightwater: Lucía quoted Business for 40 engineers and proposed a two-week trial on one Perforce stream.
- Northpine: two-year order form for 180 seats and a dedicated region is out; the cutover plan goes to the QBR.

### Billing

- June reports the first ten customers are on per-seat plus metered storage with no proration issues. The next cohort moves next week.

## Decisions

- Go for Cairn 1.8 on Friday if the multipart fix merges by Thursday noon.
- The SOC 2 Type I delivery date is a contract term for Meridian, so it is now a tracked date, not a best effort.

## Action items

- [x] Send the Meridian paid-plan proposal (Lucía)
- [ ] Review the Scribe's 1.8 release notes and reply with changes (Astrid)
- [ ] Add the eviction backlog panel to the cache-node dashboard (Anika)
- [ ] Move the second billing cohort to the metered line (June)
- [ ] Confirm the auditor's Type I report date in writing (Astrid)
- [ ] Draft the Northpine dedicated-region cutover plan for the QBR (Omar)
`,

  [eventNoteKey('On-call handoff', -5)]: `## Attendees

- Anika Rao (outgoing)
- Tomás Vidal (incoming)

## Summary

Quiet week with nothing open. Tomás has the pager through release day, so the handoff focused on what release Friday can break.

## State of production

- Disk alerts on cache-node-07 are tuned now. A page from that node is real, not noise; follow the disk pressure runbook and check the eviction backlog before expanding the volume.
- S3 multipart retries are above baseline. Felix's retry fix with backoff on 503 is in review and should settle them; until then, retries alone are not a page.
- The hash-mismatch alert has fired only for explained cases this week. If it fires for Okapi, tell Astrid before anything else.
- EU p99 read latency has stayed under 250 ms since the last incident.

## Release Friday

- Expect a busy afternoon: keys change in 1.8, so every runner image takes one cold build after upgrade. Cold builds raise read latency and lookups for an hour or two.
- A cold build on a big monorepo can fire thousands of lookups in its first seconds. If the rate limiter starts rejecting on release day, raise the burst for that key rather than scaling nodes.
- Customer webhooks for hash-mismatch alerts go live with the release. Watch delivery errors in the first hour.

## Escalation

- Anika is a phone call away all week.
- Omar is secondary for anything in the cache engine; June for the API and billing.

## Action items

- [x] Hand over the pager and confirm PagerDuty routing to Tomás (Anika)
- [ ] Read the disk pressure and cold-build runbooks before Friday (Tomás)
- [ ] Watch the API error dashboard during the 1.8 rollout and post a summary in the release channel (Tomás)
- [ ] Check the S3 multipart retry rate after Felix's fix merges (Tomás)
- [ ] Update the on-call runbook with the release-day lookup spike (Anika)
`,

  [eventNoteKey('Meridian security review', -6)]: `## Attendees

- Aisha Bello, Head of Platform, Meridian Health Data
- Ted Kowalski, Security Engineer, Meridian Health Data
- Kenji Moreau, Compliance Officer, Meridian Health Data
- Astrid Holm
- Anika Rao

## Agenda

1. Live walkthrough of access logging
2. SOC 2 status
3. Remaining questionnaire items
4. Path to the paid plan

## Discussion

### Access logging walkthrough

- Anika requested a session on Meridian's trial bucket through the access tool. Astrid approved it, which showed that a requester cannot approve their own session.
- The role was granted for one hour and expired on its own. Ted watched every session and API call land in CloudTrail with the requester, approver and bucket.
- Ted confirmed again that only Anika and Omar can request bucket access, neither has standing access, and the log is reviewed monthly.

### SOC 2

- Fieldwork for the Type I report is complete; the report is due within weeks. Astrid brought the auditor's letter with the expected date, which Kenji said is enough for now.
- The Type II observation window starts after Type I, so the Type II report is expected next year.

### Questionnaire

- Ted's traffic capture in the trial workspace matches Anika's data flow: content-addressed build outputs and their hashes only.
- Environment variables and command lines are never sent. Request logs keep path, status code and latency for 30 days.
- Kenji confirmed that no PHI reaches Cairn, so Meridian classifies Alien Labs as low risk and no BAA is needed.

### Paid plan

- Aisha wants the paid plan in place before Meridian's quarterly budget closes. The trial cut CI on the moved pipelines from 34 minutes to 12.

## Decisions

- Ted recommends sign-off with no technical blockers.
- Kenji signs off on condition that the SOC 2 Type I report reaches Meridian within 60 days.

## Action items

- [x] Send the auditor's letter with the expected Type I date (Astrid)
- [ ] Send the Type I report under NDA when it lands (Astrid)
- [ ] Export the CloudTrail entries from today's session for Ted's records (Anika)
- [ ] Send written sign-off to Aisha (Kenji)
- [ ] Prepare the paid-plan proposal for 60 seats on Enterprise (Astrid, with Lucía)
`,

  [eventNoteKey('Sprint planning', -8)]: `## Attendees

- Astrid Holm
- Omar Haddad
- Felix Andersen
- June Okonkwo
- Tomás Vidal

## Goals for this sprint

1. Close the Cairn 1.8 release train for Friday next week
2. Billing: usage meter, Stripe prepay credits and invoice previews
3. Start the cache dashboard setup checklist

## Release 1.8

- Runner-image digest in the cache key: merged, running in staging.
- Rejected hash-mismatch writes: merged. The customer alert by webhook or email still needs the delivery retry policy.
- SCIM deactivation revokes API tokens and ends sessions: merged, verified with Northpine in production.
- setup-cairn as a verified GitHub Actions partner integration: listing approved, goes live with the release.
- S3 multipart retry on 503 with backoff: Felix has the change ready for review this week.

## Billing

- June will put the usage meter for metered storage behind a flag for the first ten customers, now that the Stripe working session fixed prepay credits on the metered line.
- Invoice previews are a stretch goal; customers ask for them before the first metered invoice.

## Frontend

- Tomás starts the setup checklist from Ben's empty-state designs: install the agent, add setup-cairn to a workflow, run a first build. Each step ticks itself off when the event arrives.
- The second step links straight to the setup-cairn docs.

## Risks

- June's rate limiter is 100 requests a second sustained with a burst of 500. A cold build on a big monorepo fires thousands of lookups at once, and 1.8 forces a cold build per runner image. Omar will review the burst settings before release.
- Carry-over from last sprint: the Okapi action items. Customer alerts are the last one, and they ship in 1.8.

## Decisions

- Code freeze for 1.8 is Thursday next week at noon.
- Invoice previews slip to the next sprint if the meter is not in staging by Wednesday.

## Action items

- [ ] Open the S3 multipart retry pull request in alien-labs/cairn (Felix)
- [ ] Add a delivery retry policy for customer alert webhooks (Omar)
- [ ] Review the rate limiter burst settings against a cold build (Omar)
- [ ] Ship the usage meter behind a flag for the first billing cohort (June)
- [ ] Build the setup checklist empty state (Tomás)
- [ ] Ask the Scribe to draft the 1.8 release notes after the freeze (Astrid)
`,

  [eventNoteKey('Interview: Imogen Clarke', -9)]: `## Panel

- Astrid Holm (hiring manager)
- June Okonkwo (API design conversation)
- Tomás Vidal (pairing session)

## Role

Frontend engineer. Imogen's portfolio is mostly data-heavy dashboards, which is close to the cache dashboard Tomás and Ben are building.

## API design conversation (June)

- Prompt: design the API behind the cache dashboard's hit-rate chart for a workspace with thousands of targets.
- Imogen asked about data volume before drawing anything, and proposed server-side aggregation by time bucket with a cursor for the drill-down.
- She raised caching the aggregates herself and asked how stale a chart can be before customers notice.
- Weaker on auth: she had not thought about per-workspace API keys until June asked.

## Pairing session (Tomás)

- Task: the dashboard empty-states checklist, sized for an hour.
- She wrote the step component first and the tests second, but the tests covered the tick-off-on-event case without prompting.
- Good questions about how events reach the browser. She suggested an optimistic tick that reconciles with the server.
- Ran out of time on the link to the setup-cairn docs; the rest worked.

## Astrid's conversation

- Wants a smaller team where she owns a surface end to end.
- Comfortable working across Lisbon and Toronto hours.

## Scorecards

- Scorecards are due before the debrief, written independently.

## Action items

- [ ] Submit API design scorecard (June)
- [ ] Submit pairing scorecard with the session code attached (Tomás)
- [ ] Schedule the debrief once both scorecards are in (Astrid)
- [ ] Send Imogen a thank-you note and expected timeline (Astrid)
- [x] Share the empty-states task brief with the panel (Tomás)
`,

  [eventNoteKey('Astrid / Kofi 1:1', -9)]: `## Attendees

- Astrid Holm
- Kofi Mensah

## Agenda

1. GitHub Actions partner listing for setup-cairn
2. Cairn 1.8 launch content
3. Pipeline support: Lumen, Halcyon and new inbound
4. Kofi's growth plan

## Discussion

### GitHub partner program

- The verified setup-cairn listing is approved and goes live with 1.8. Sofia at GitHub wants the listing copy and two screenshots a week before release.
- Kofi will keep the action's README in alien-labs/cairn as the single source; the listing links to it.

### 1.8 launch

- The headline is the runner-image cache key. Okapi is credited for the report, if Nadia agrees.
- Kofi will write a Cache Line issue on why the first build after upgrade is cold and how to warm caches ahead of rollout.
- The Scribe drafts the release notes; Kofi edits the announcement from them rather than writing from scratch.

### Pipeline

- Lumen signed for 150 seats. The first pipeline group is on the cache; the imaging pipelines are next, and Kofi owns the hit-rate report for that check-in.
- Halcyon Freight wants a clean Gradle build scan read on an intro call. Kofi will bring a sample from their Android CI if Priya can share one.
- The build-systems meetup produced a few leads. One studio on Unreal looked promising after Kofi's laptop demo.

### Growth

- Kofi wants to own a technical talk at the next build-systems conference. Astrid agreed to fund the travel if the abstract is accepted.

## Action items

- [ ] Send Sofia the listing copy and screenshots (Kofi)
- [ ] Draft the Cache Line issue on cold builds after the 1.8 upgrade (Kofi)
- [ ] Ask Nadia whether Okapi can be credited in the release notes (Astrid)
- [ ] Prepare the hit-rate report for the Lumen imaging pipelines (Kofi)
- [ ] Submit the conference abstract (Kofi)
- [x] Approve Kofi's meetup expenses (Astrid)
`,

  [eventNoteKey('Team sync', -9)]: `## Attendees

- Astrid Holm
- Omar Haddad
- June Okonkwo
- Anika Rao
- Lucía Ferreira

## Agenda

1. Cache v2 rollout status
2. Okapi follow-ups
3. Meridian security review on Thursday
4. Customer roundup
5. Who is on call next week

## Discussion

### Cache v2 rollout

- The arm64 move for cache nodes is done. Baseline compute dropped about 20% with the same p99.
- Omar is testing Cloudflare R2 as the read tier, with S3 staying the system of record. Felix's early numbers point to a large egress saving; the cost model needs request counts first.
- Cloudflare credits are on the account. Anika will size the annual commit at about 80% of the new baseline, and the architecture review covers the new US region too.

### Okapi

- The last open postmortem action is customer alerts. Hash-mismatch alerts go to the customer by webhook or email in 1.8, so Nadia's on-call gets them directly.
- Until 1.8 ships, the internal on-call tells Astrid first if the alert fires for Okapi.

### Meridian

- Ted wants to see one approval, one session and its CloudTrail entries live on Thursday. Anika runs the demo; Astrid brings the auditor's letter if the Type I report has not arrived.

### Customers

- Northpine: renewal at 180 seats plus a dedicated region; Lucía is preparing the quote.
- Lumen: rollout check-in on the second pipeline group is scheduled.
- Vantage: discovery last week. Claire needs US-only data residency before her team commits.

### On call

- Tomás has the pager next week, through the 1.8 release.

## Decisions

- Commit to Cloudflare only after the R2 request numbers are in, so one commit covers both.

## Action items

- [ ] Size the Cloudflare annual commit against the arm64 baseline (Anika)
- [ ] Get R2 request counts from Felix for the cost model (Omar)
- [ ] Prepare the access logging demo for Meridian (Anika)
- [ ] Send the Northpine renewal quote (Lucía)
- [ ] Confirm the customer alert webhook format with Okapi (June)
- [x] Publish next week's on-call schedule (Anika)
`,

  [eventNoteKey('On-call handoff', -12)]: `## Attendees

- Anika Rao (outgoing)
- June Okonkwo (incoming)

## Summary

One page this week, from the hash-mismatch alert, and it was explained. June takes the pager for a week of release preparation.

## State of production

- The hash-mismatch alert fired once, for a customer re-running a build with a patched compiler. Expected, but it shows the alert is not always us.
- PostHog disk warnings on cache-node-07 are still noisy. Ack them unless usage passes 90%; tuning lands next week.
- The arm64 cache nodes have run for a week without a page. Compare p99 read latency against the x86 baseline daily.
- R2 Class B operations were the top product in the last Cloudflare budget alert. Nothing to do on call, but expect another budget alert before month end.

## API and billing

- June knows this area best. The first billing cohort on the metered line starts next week, so watch Stripe webhook errors.
- Monday mornings are still loud on the API error dashboard when one customer's weekly builds start. Rate-limit their key rather than scaling up.

## Watch list

- If the hash-mismatch alert fires for Okapi, tell Astrid before anything else.
- Hana is shadowing on-call from next month. She can sit in on any page this week if she is online.

## Escalation

- Anika stays reachable by phone.
- Omar is secondary for the cache engine.

## Action items

- [x] Hand over the pager and confirm PagerDuty routing to June (Anika)
- [ ] Tune the cache-node-07 disk warning threshold (Anika)
- [ ] Watch Stripe webhook errors when the first billing cohort moves (June)
- [ ] Record arm64 p99 read latency against the x86 baseline (June)
- [ ] Invite Hana to shadow any page this week (June)
`,

  [eventNoteKey('Retro', -12)]: `## Attendees

- Astrid Holm
- Omar Haddad
- Felix Andersen
- Hana Sato
- Anika Rao

## Scope

The two weeks since the last retro: the arm64 move, the R2 read-tier test, the Okapi follow-ups and Hana's first days.

## Went well

- Release notes for 1.7 were drafted by the Scribe from merged pull requests. Astrid only edited the order.
- The arm64 move for cache nodes finished on time, with the same p99 for about 20% less compute.
- Felix's first R2 cost model came together in two days from production request logs.
- Hana reproduced the flaky eviction test on her second day.

## Did not go well

- Agent pull requests from Builder waited three or four days for review, so they went stale against main and needed rebasing.
- The cache-node-07 disk warnings in PostHog are still noisy, and people have started to ack without looking.
- Two Okapi action items had no owner for a week after the postmortem review.

## Change

- Review agent pull requests within one working day, like human ones. The reviewer is whoever owns the area in CODEOWNERS.
- Every postmortem action has a named owner and a date before the review ends.
- Tune or delete any alert that is acked without action three times in a week.

## Discussion

- Omar asked whether Builder tasks are too big. Felix suggested capping them at one package, so a review fits in thirty minutes.
- Hana said the cache-engine walkthrough with Omar was the most useful part of her first week and asked for the same on the API side.

## Action items

- [ ] Add a one-day review target for agent pull requests to the handbook (Astrid)
- [ ] Split Builder tasks to one package each in alien-labs/cairn (Omar)
- [ ] Tune the cache-node-07 disk alert or delete it (Anika)
- [ ] Assign owners and dates to the open Okapi actions (Astrid)
- [ ] Book an API walkthrough for Hana with June (Hana)
- [x] Merge the flaky eviction test fix (Hana)
`,
};
