# Alien Labs inbox and CRM

Astrid's inbox, contacts and calendar. Two months of mail, a year of calendar, and every contact who
writes in also turns up on the calendar.

- Code: `organizations.ts`, `contacts.ts`, `views.ts`, `pipeline.ts`, `mail.ts`, `calendar.ts`, `util.ts`, `partial.ts`,
  `index.ts`, `partial.test.ts`
- Requires: [team](../team/CONTENT.md) (`orgs.fieldstone`, `people.*`, `agents.scribe`)
- Provides: `orgs.<key>`, `people.<key>` for the contacts below, `mailbox`, `calendar`,
  `threads.<key>`, `events.<key>`, `pipeline` (the Sales pipeline Kanban and its deals)
- Clock: every timed event falls on a weekday. Mail runs from −60d to the reference date. The calendar runs from −182d to +182d. The
  reference date should fall on a Wednesday.
- Used by: Alien Labs (`../FieldstoneSpace.ts`)

## Contents

### Organizations

- 3 vendors, real company names, status `active`: `github` GitHub, `stripe` Stripe, `cloudflare`
  Cloudflare (the primary cloud).
- 10 customers, fictional, each a deal on the Sales pipeline:
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
- 1 venue, fictional: `saltmarsh` Saltmarsh Lodge, `active`, hosts the team offsite.
- Every organization has a description and website. Customers have a location.

### Contacts

- 21 `Person.Person` outside Alien Labs, fictional, each with a work email on its organization's
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
  - `wren` Wren Calloway, Events Coordinator, Saltmarsh Lodge
- 7 of these were extracted from mail rather than entered by hand: `marcus`, `ruth`, `ted`, `sam`,
  `priya`, `owen`, `wren`. Their records hold only a name, an email and an organization matched by email domain,
  written the way `ExtractContactFromMessage` writes an extraction. The job titles above are what
  their mail says, not stored fields. Like `buildContactFromActor`, each holds `fullName`, one email with no
  label, and `organization`; like the `ExtractMessage` dispatcher on a feed message,
  `mailbox.extracted[messageId]` lists the contact's id under the first message they sent.
- Views:
  - Table over Person: name, job title, organization, email
  - Kanban over Person by department, built with `Kanban.makeItems` and `pivotField: 'department'`,
    holding every person with a department. Columns in order: Leadership, Engineering, Product,
    Design, Developer Relations, Sales, Partnerships, Security. Extracted
    contacts have no department and stay off the board until someone sets one. A view Kanban cannot
    be used: it pivots only on a single-select field, and `Person` has none.
  - Table and Kanban over Organization, the Kanban by `status`

### Sales pipeline

- 1 `Deal` type, `com.alienlabs.type.deal`, defined in `pipeline.ts` and stored in the space with
  `Database.addType`: `Organization.status` has five fixed values and a view Kanban pivots only on a
  single-select field, so the stages need their own schema. Fields: `name`, `organization` →
  Organization, `contact` → Person, `owner` → Person (Alien Labs), `stage` (single select), `value`
  (USD a year), `closeDate`, `nextStep`.
- 1 Kanban "Sales pipeline", built with `Kanban.make` over a View of `Deal` with
  `pivotFieldName: 'stage'`. Columns in order, with each customer's deal:
  - Lead: `halcyon`, `kestrel`
  - Qualified: `vantage`
  - Demo: `brightwater`
  - Proposal: `meridian`
  - Negotiation: `northpine` (renewal), `tidewater`
  - Closed won: `okapi`, `lumen`
  - Closed lost: `pallas`
- 10 `Deal`s, one per customer. Each customer's contact writes at least one message in a thread that
  matches its stage.

### Mail

- 1 `Mailbox` "Inbox", Astrid's. `Mailbox` has no owner field: her mail is the mail tagged `sent`.
  It is the only mailbox in the space, which the contact view's related messages rely on.
- Every message has `properties.subject`, which the contact view shows.
- 180 `Message`s in 100 threads, from −60d to the reference date. Every weekday has mail.
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
- Named threads, 100 messages in 30 threads:
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

### Calendar

- 1 `Calendar` "Alien Labs", the only calendar in the space. `Calendar` has no owner field: every
  `Event.owner` is Astrid. 310 `Event`s from −182d to +182d, so the calendar
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
- One-off events, 27:
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
    deep dive (+13d)
- 160 events have a description: every one-off names the thread it came from; team syncs, sprint
  planning, retros, product reviews and Northpine syncs rotate through agenda notes, so no two
  occurrences read alike; Hana's first five 1:1s carry her ramp-up plan. On-call handoffs and the
  other 1:1s have none.

### Collections

- None of its own. People and organizations are browsed in the navtree's CRM section, which plugin-crm
  builds over every Person and Organization; the views above live in the database. The docs partial
  files the Sales pipeline Kanban first under its Customers collection.

## Flows

These must work end to end in the app.

1. Open the inbox, open `okapiIncident`, open Nadia's message in the conversation, hover her avatar
   to see her card, and open her contact.
2. From Nadia's contact, open the Person Kanban and find her under Engineering.
3. From Nadia's contact, open the Okapi alerting follow-up from her upcoming events. The contact
   view lists the 5 newest messages and up to 3 recent and 3 upcoming events, matched by `contact`
   ref or email.
4. Open the inbox, open `offsite`, click Wren, open her contact, open the offsite event.
5. Scroll the inbox back two months and the calendar back six months without reaching the end early.

## Checks

- 14 organizations (15 with team), 21 people (31 with team), 5 views (2 Table, 3 Kanban).
- Every type in the archive is declared by a partial or is a core type; the one persisted schema is `Deal`.
- The Sales pipeline Kanban is a view Kanban with the 7 stages in order; 10 deals, at least one per
  stage, each column's card order matching its deals; every deal's customer has a message from a
  person at that organization.
- The Person Kanban holds 24 people: everyone but the 7 extracted contacts.
- 180 messages in 100 threads. The oldest is at −60d and the newest at the reference date.
- 310 events. Every week from −182d to +182d has at least one.
- Every message from a person in the space has a sender Actor with `contact` set.
- Every external contact with a thread attends at least one event.
- Nadia attends an event after the reference date: the Okapi alerting follow-up.
- Every event attendee who is a person in the space has `contact` set.
- No event has more than 5 attendees.
- No automated sender links to a contact.
- The 7 extracted contacts look like extractions and the other 14 do not.
