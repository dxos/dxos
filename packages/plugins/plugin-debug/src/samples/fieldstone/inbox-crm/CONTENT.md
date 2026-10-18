# Alien Labs inbox and CRM

Astrid's inbox, contacts and calendar. Two months of mail, a year of calendar, and every contact who
writes in also turns up on the calendar.

- Code: `organizations.ts`, `contacts.ts`, `views.ts`, `pipeline.ts`, `mail.ts`, `calendar.ts`, `util.ts`, `partial.ts`,
  `index.ts`, `partial.test.ts`, `pipeline.test.ts`; logos from `../logo.ts`
- Requires: [team](../team/CONTENT.md) (`orgs.fieldstone`, `people.*`, `agents.scribe`)
- Provides: `orgs.<key>`, `people.<key>` for the contacts below, `mailbox`, `calendar`,
  `threads.<key>`, `events.<key>`, `pipeline` (the Sales pipeline Kanban)
- Clock: every timed event falls on a weekday. Mail runs from −60d to the reference date. The calendar runs from −182d to +182d. The
  reference date should fall on a Wednesday.
- Used by: Alien Labs (`../FieldstoneSpace.ts`)

## Contents

### Organizations

- 3 vendors, real company names, status `active`: `github` GitHub, `stripe` Stripe, `cloudflare`
  Cloudflare (the primary cloud).
- 13 customers, fictional, each on the Sales pipeline:
  - `northpine` Northpine Robotics, `active`, the largest customer, renewal due next month
  - `meridian` Meridian Health Data, `qualified`, enterprise trial blocked on a security review
  - `okapi` Okapi Payments, `active`, hit a cache-corruption incident five weeks ago
  - `brightwater` Brightwater Games, `prospect`, inbound lead
  - `halcyon` Halcyon Freight, `prospect`, inbound lead on Gradle
  - `kestrel` Kestrel Energy, `prospect`, inbound lead on Bazel
  - `vantage` Vantage Aerospace, `qualified`, needs US-only data residency
  - `tidewater` Tidewater Insurance, `qualified`, security review passed, MSA in redlines
  - `lumen` Lumen Biotech, `active`, signed three weeks ago
  - `pallas` Pallas Retail Group, `reject`, lost to a self-hosted cache
  - `corvid` Corvid Analytics, `qualified`, Pants monorepo, technical evaluation approved
  - `larkspur` Larkspur Media, `prospect`, Nx monorepo, demo booked
  - `aldermoor` Aldermoor Bank, `qualified`, Maven to Bazel, Enterprise proposal with procurement
- 1 venue, fictional: `saltmarsh` Saltmarsh Lodge, `active`, hosts the team offsite.
- Every organization has a description and website. Customers have a location.
- Every organization, the team's included, has a logo in `image`: a 16:9 SVG banner (a white
  geometric mark over the name on a brand colour, no yellow) as a data URL, under 1KB, which the
  Organization card shows as its poster.

### Contacts

- 24 `Person.Person` outside Alien Labs, fictional, each with a work email on its organization's
  domain and `Person → Organization (organization)`. Each line gives key, name, job title,
  organization and, for contacts entered by hand, `department`:
  - `dana` Dana Whitfield, Account Executive, Stripe, Sales
  - `elena` Elena Marsh, Solutions Architect, Cloudflare, Sales
  - `sofia` Sofia Brandt, Partner Manager, GitHub, Partnerships
  - `ines` Inês Duarte, Enterprise Account Executive, Cloudflare, Sales
  - `grace` Grace Liu, VP Engineering, Northpine, Leadership
  - `marcus` Marcus Bell, Platform Lead, Northpine
  - `ruth` Ruth Adeyemi, Procurement Manager, Northpine
  - `aisha` Aisha Bello, Head of Platform, Meridian, Engineering
  - `ted` Ted Kowalski, Security Engineer, Meridian
  - `kenji` Kenji Moreau, Compliance Officer, Meridian, Security
  - `nadia` Nadia Petrov, Engineering Director, Okapi, Engineering
  - `sam` Sam Reyes, Staff Engineer, Okapi
  - `leo` Leo Marchetti, CTO, Brightwater, Leadership
  - `mila` Mila Novak, Engineering Manager, Brightwater, Engineering
  - `priya` Priya Raman, Platform Engineer, Halcyon Freight
  - `owen` Owen Fairley, Build Infrastructure Lead, Kestrel Energy
  - `claire` Claire Dubois, Director of Software Engineering, Vantage Aerospace, Engineering
  - `rohan` Rohan Mehta, VP Platform Engineering, Tidewater Insurance, Leadership
  - `tobias` Tobias Lindqvist, Head of Research Computing, Lumen Biotech, Engineering
  - `carmen` Carmen Ruiz, Engineering Director, Pallas Retail Group, Engineering
  - `daniel` Daniel Okafor, Head of Developer Productivity, Corvid Analytics, Engineering
  - `yuki` Yuki Tanaka, Staff Engineer, Developer Experience, Larkspur Media, Engineering
  - `henrik` Henrik Solberg, Director of Engineering Platforms, Aldermoor Bank, Leadership
  - `wren` Wren Calloway, Events Coordinator, Saltmarsh Lodge
- 7 of these were extracted from mail rather than entered by hand: `marcus`, `ruth`, `ted`, `sam`,
  `priya`, `owen`, `wren`. Their records hold only a name, an email and an organization matched by email domain,
  written the way `ExtractContactFromMessage` writes an extraction. The job titles above are what
  their mail says, not stored fields. Like `buildContactFromActor`, each holds `fullName`, one email with no
  label, and `organization`; like the `ExtractMessage` dispatcher on a feed message,
  `mailbox.extracted[messageId]` lists the contact's id under the first message they sent.
- Views:
  - Table over Person: name, job title, organization, email
  - Table over Organization: name, status, website, description

### Sales pipeline

- 1 Kanban "Sales pipeline", built with `Kanban.makeItems` over the customer organizations, so each
  card is the Organization card with its logo. `Organization` has no stage field (`status` has five
  fixed values), so `pivotField` is empty: the arrangement alone places each card, and dragging one
  rewrites the arrangement, never the organization. The Uncategorized column is hidden. Columns in
  order, with their cards:
  - Lead: `halcyon`, `kestrel`
  - Qualified: `vantage`, `corvid`
  - Demo: `brightwater`, `larkspur`
  - Proposal: `meridian`, `aldermoor`
  - Negotiation: `northpine` (renewal), `tidewater`
  - Closed won: `okapi`, `lumen`
  - Closed lost: `pallas`
- Each customer's contact writes at least one message in a thread that matches its stage.

### Mail

- 1 `Mailbox` "Inbox", Astrid's. `Mailbox` has no owner field: her mail is the mail tagged `sent`.
  It is the only mailbox in the space, which the contact view's related messages rely on.
- Every message has `properties.subject`, which the contact view shows.
- 188 `Message`s in 103 threads, from −60d to the reference date. Every weekday has mail.
- Threads share a `threadId`; each reply's `parentMessage` is the previous message in its thread.
  Replies quote briefly and read like real mail: a little terse, signed with a first name.
- Length: most named-thread messages run 2 to 5 short paragraphs (about 60 to 200 words) with a
  greeting, concrete specifics and a sign-off; a few replies stay a line or two. Nadia's "Read it
  twice" reply in `okapiIncident` is the longest message in the inbox, about 200 words. Background
  threads run 1 to 3 short paragraphs, and automated mail follows each service's own template.
- Senders are `Actor`s. When the sender is a `Person` in the space, the Actor carries
  `contact: Ref<Person>` as well as name and email. Automated senders carry no contact. The Scribe's
  Actor carries its `identityDid`. `Message` has no recipient field, so recipients are RFC 5322
  address lists in `properties.to` and `properties.cc`, as synced mail stores them.
- Named threads, 108 messages in 33 threads:
  - Customers:
    - `northpineSso` Northpine SSO rollout: Grace, Marcus, Astrid, June, 7 messages, from −44d
    - `northpineRenewal` Northpine renewal and seat count: Grace, Ruth, Astrid, Lucía, 5 messages
    - `meridianSecurity` Meridian security questionnaire: Aisha, Ted, Kenji, Astrid, Anika, 9
      messages, the first with the questionnaire as an attachment (`Message.attachments` → a
      `text/csv` `Blob`)
    - `okapiIncident` Okapi cache-corruption postmortem: Nadia, Sam, Omar, Anika, Astrid, 8
      messages, from −35d
    - `brightwaterIntro` Brightwater intro and pricing: Leo, Mila, Lucía, Kofi, 5 messages
  - Sales pipeline:
    - `halcyonInbound` Cairn for Halcyon Freight's Android builds: Priya, Astrid, Kofi, 3 messages
    - `kestrelInbound` Remote cache for a Bazel monorepo at Kestrel: Owen, Kofi, 3 messages
    - `vantageDiscovery` Vantage Aerospace: notes from discovery: Claire, Astrid, Omar, 3 messages
    - `vantageResidency` Vantage: US-only data residency: Claire, Anika, 2 messages
    - `meridianProposal` Meridian paid plan proposal: Lucía, Aisha, 3 messages
    - `tidewaterSecurity` Tidewater vendor security review: Rohan, Anika, 3 messages
    - `tidewaterMsa` Tidewater MSA redlines: Rohan, Lucía, Astrid, 4 messages
    - `lumenSigned` Lumen Biotech order form: Lucía, Tobias, Astrid, 3 messages
    - `lumenRollout` Lumen rollout: second pipeline group: Tobias, Kofi, 3 messages
    - `pallasDecision` Pallas Retail: decision on Cairn: Carmen, Astrid, 3 messages
    - `corvidEvaluation` Corvid Analytics: Pants remote cache evaluation: Daniel, Astrid, Kofi, 3
      messages, from −22d
    - `larkspurDemo` Nx remote cache demo for Larkspur Media: Yuki, Kofi, 2 messages, from −16d
    - `aldermoorProposal` Aldermoor Bank: Enterprise proposal: Henrik, Lucía, Astrid, 3 messages,
      from −28d
  - Vendors:
    - `stripeBilling` Stripe usage-based billing migration: Dana, June, 6 messages
    - `cloudflareCredits` Cloudflare credits and an annual commit: Elena, Anika, Astrid, 4 messages
    - `cloudflareR2` Cloudflare R2 egress pricing: Inês, Omar, Felix, 3 messages
    - `githubPartner` GitHub Actions integration partner program: Sofia, Kofi, 4 messages
  - Internal:
    - `offsite` Q4 offsite planning: Wren, Astrid, Lucía, Ben, 6 messages
    - `hanaOnboarding` Welcome Hana: Astrid, Hana, Omar, 3 messages
    - `releaseNotes` Cairn 1.8 release notes draft from the Scribe agent, 2 messages
    - `weeklyUpdate` Astrid's weekly update, one thread per week, 8 issues
- Background threads, 30 messages in 20 threads of 1 to 3: code review questions, on-call handoffs,
  time off, interview scheduling, expense approvals. All between people in the space.
- Automated mail, 50 single messages, no contact: GitHub review requests and CI failures, Linear
  digests, PostHog alerts, Stripe payouts, Cloudflare billing notifications, two newsletters with
  `listUnsubscribe`.
- Tags: `inbox` on all but 30 archived messages (15 in settled background threads, the 15 oldest
  automated), `sent` on Astrid's, `starred` on 5, `important` on the customer threads, `promotions` on
  the 8 newsletter issues, `updates` on the other 42 automated messages.
- 5 thread summaries in the annotations feed, one each for `northpineSso`, `meridianSecurity`,
  `okapiIncident`, `stripeBilling`, `offsite`.
- 10 message summaries in the annotations feed, one for each of the 10 most recent messages
  (`message-summaries.ts`): the gist, key points, asks and deadlines, and suggested next actions.

### Calendar

- 1 `Calendar` "Alien Labs", the only calendar in the space. `Calendar` has no owner field: every
  `Event.owner` is Astrid. 313 `Event`s from −182d to +182d, so the calendar
  scrolls through a full year. Attendees are `Actor`s with `contact: Ref<Person>`; no event has more than 5.
- `Event` has no recurrence field, so each repeating series is stored as one `Event` per
  occurrence. Occurrences of a series share title, time of day, duration and attendees, except that
  the on-call handoff's incoming engineer rotates weekly. Monthly series repeat every 30 days, moved
  off weekends.
- Repeating series, 283 events:
  - `teamSync` Team sync, weekly on Monday at 10:00, Astrid, Omar, June, Anika, Lucía, 52
  - `sprintPlanning` Sprint planning, every other Tuesday, Astrid, Omar, Felix, June, Tomás, 26
  - `retro` Retro, every other Friday, Astrid, Omar, Felix, Hana, Anika, 26
  - `oneOnOne.<key>` Astrid's monthly 1:1 with each of her 9 reports, 103. Hana's start at her join
    date.
  - `oncall` On-call handoff, weekly on Friday at 15:00, Anika and the incoming engineer, 52
  - `productReview` Product review, monthly, Astrid, Lucía, Ben, Kofi, June, 12
  - `northpineSync` Northpine sync, monthly, Grace, Marcus, Astrid, June, 12
- One-off events, 30:
  - Past: Cairn 1.7 release (all-day, −75d, Astrid, Omar, Felix, Anika, Kofi), Northpine SSO kickoff (−40d), Okapi postmortem review
    (−26d), Stripe billing working session (−20d), Hana onboarding day one (−14d), Meridian security
    review (−6d), 2 interviews (−30d, −9d)
  - Upcoming: Cairn 1.8 release (all-day, +2d, Astrid, Omar, Felix, Kofi and Sofia, whose partner
    listing goes live with it), Brightwater intro call (+5d), 2 interviews (+7d, +9d), Cloudflare pricing
    call (+6d), Cloudflare architecture review (+8d), Northpine QBR (+12d), Okapi alerting follow-up (+7d 16:00, Nadia, Sam,
    Omar, Astrid), team offsite at Saltmarsh Lodge
    (all-day, +34d to +36d, Astrid, Lucía, Ben and Wren, location set)
  - Sales pipeline, one or two per new customer: Pallas Retail demo (−36d), Lumen Biotech
    validation results (−29d), Tidewater security review (−22d), Vantage Aerospace discovery
    (−15d), Tidewater MSA review (+1d), Lumen rollout check-in (+1d), Halcyon Freight intro call
    (+6d), Meridian proposal review (+7d), Kestrel Energy discovery call (+9d), Vantage technical
    deep dive (+13d), Corvid Analytics technical evaluation (+8d), Larkspur Media demo (+12d),
    Aldermoor Bank proposal review (+14d)
- 167 events have a description: every one-off names the thread it came from; team syncs, sprint
  planning, retros, product reviews and Northpine syncs rotate through agenda notes, so no two
  occurrences read alike; Hana's first five 1:1s carry her ramp-up plan. On-call handoffs and the
  other 1:1s have none, except as below.
- The 10 most recent events before the reference date carry full markdown meeting notes instead
  (`event-notes.ts`): attendees, agenda, discussion, decisions and a task list of action items
  owned by attendees. They are the Omar 1:1 (0d), team syncs (−2d, −9d), on-call handoffs (−5d,
  −12d), the Meridian security review (−6d), sprint planning (−8d), Imogen Clarke's interview and
  the Kofi 1:1 (−9d), and the retro (−12d).

### Collections

- None of its own. People and organizations are browsed in the navtree's CRM section, which plugin-crm
  builds over every Person and Organization; the views above live in the database. The docs partial
  files the Sales pipeline Kanban first under its Customers collection.

## Flows

These must work end to end in the app.

1. Open the inbox, open `okapiIncident`, open Nadia's message in the conversation, hover her avatar
   to see her card, and open her contact.
2. Open the Sales pipeline and find Okapi Payments, with its logo, under Closed won.
3. From Nadia's contact, open the Okapi alerting follow-up from her upcoming events. The contact
   view lists the 5 newest messages and up to 3 recent and 3 upcoming events, matched by `contact`
   ref or email.
4. Open the inbox, open `offsite`, click Wren, open her contact, open the offsite event.
5. Scroll the inbox back two months and the calendar back six months without reaching the end early.

## Checks

- 17 organizations (18 with team), 24 people (34 with team), 2 Tables and 1 Kanban.
- Every type in the archive is declared by a partial or is a core type; no schema is persisted.
- The Sales pipeline is the only Kanban: an items Kanban with the 7 stages in order and at least 10
  distinct organizations, 2 to 5 in each of Lead, Qualified, Demo and Proposal, each column's card
  order matching `PIPELINE`; every customer has a message from a person at that organization.
- Every organization has a distinct SVG logo under 1KB.
- 188 messages in 103 threads. The oldest is at −60d and the newest at the reference date.
- 313 events. Every week from −182d to +182d has at least one.
- Every message from a person in the space has a sender Actor with `contact` set.
- Every external contact with a thread attends at least one event.
- Nadia attends an event after the reference date: the Okapi alerting follow-up.
- Every event attendee who is a person in the space has `contact` set.
- No event has more than 5 attendees.
- No automated sender links to a contact.
- The 7 extracted contacts look like extractions and the other 14 do not.
