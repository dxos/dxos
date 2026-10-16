# Bramble Coffee Roasters

A small Oakland coffee roastery in the middle of a spring blend launch. Kai Chen, head roaster, is
the main character.

- Code: `partial.ts`, built from the phase files beside it. World facts are in `ABOUT.md`, the space tour
  in `README.md`.
- Requires: nothing
- Provides: `orgs.*`, `people.*`, `taskSets.*`, `projects.*` (keys below)
- Clock: reference `2026-05-20T15:00:00Z`, overridable with `NOW`. Content runs from −12d to +21d.
- Used by: `BrambleSpace.makeTemplate`

## Contents

### Organizations and people

- 6 `Organization.Organization`, each with description, status, website and location:
  - `bramble` Bramble Coffee Roasters (active, Oakland)
  - `fincaEsperanza` Finca Esperanza (active, Huila, Colombia)
  - `sidamoCoop` Sidamo Cooperative (active, Ethiopia)
  - `northStar` North Star Café (active, Portland)
  - `hatch` Hatch Bakery (qualified, Brooklyn)
  - `oliveAndVine` Olive & Vine (prospect, Austin)
- 9 `Person.Person`, each with a work email and `Person → Organization (organization)`:
  - Bramble: `kai` Kai Chen (Head Roaster), `diego` Diego Alvarez (Sourcing), `sam` Sam Okafor
    (Wholesale Lead), `riley` Riley Tanaka (Operations)
  - `carmen` Carmen Restrepo (Esperanza), `abel` Abel Tadesse (Sidamo), `jordan` Jordan Park (North
    Star), `priya` Priya Shah (Hatch), `mateo` Mateo Ruiz (Olive & Vine)
- 3 views over Organization: Table, Kanban (by status), Map.

### Mail

- 1 `Mailbox` "Inbox": 36 messages in 24 threads, plus 5 thread summaries in the annotations feed.
- Threads share a `threadId` (subject slug); each reply's `parentMessage` is the previous message.
- Senders are Actors (name, email) copied from the people seeds. Non-person senders: Stripe, SCA
  Events, UPS, Daily Coffee News, Stack & Co. Packaging.
- Tags: `inbox` (all but 5 archived), `sent` (Kai's messages), `starred`, `important`, `updates`,
  `promotions`. 4 messages carry `listUnsubscribe`, which fills `mailbox.subscriptions`.

### Calendar

- 1 `Calendar` "Bramble Calendar", owner Kai, 9 `Event`s from −12d to +21d: two standups, a tasting
  with North Star, Q2 planning, an equipment demo, Olive & Vine onboarding, a Hatch cupping, Coffee
  Expo NYC, a site visit to Finca Esperanza.
- Attendees are Actors copied from the people seeds.

### Tasks and projects

- 4 `TaskSet`, 5 `Milestone`, 23 `Task`: 4 done, 5 started, 13 todo, 1 blocked.
- Assigned tasks link `Task → Person (assignee.contact)`. 5 tasks are unassigned agent briefs.
- 4 `Project.Project`, each with `Instructions` and its TaskSet:
  - `springBlend` Spring Blend Launch (active)
  - `sourcingTrip` Q2 Sourcing Trip (active)
  - `oliveAndVine` Olive & Vine Onboarding (active)
  - `roasteryOps` Roastery Ops (blocked), with a disabled weekly-report routine (`0 8 * * 1`)
- Projects list their artifacts (notes, drawings, sheets) by Ref.

### Content

- 7 `Markdown.Document`: Space Tour, About Bramble, cupping notes, sourcing-trip itinerary, tasting
  protocol (embeds the Spring Blend TaskSet), wholesale terms, Olive & Vine welcome packet. Notes link
  people and orgs inline.
- 2 `Drawing` (tldraw): roastery floor plan, spring blend flavor wheel.
- 2 `Sheet` with formulas: green coffee inventory, wholesale price list.
- Custom schema `example.type.roastLog` ("Roast Log"), stored in the space: 8 rows (3 approved, 1
  cupped, 2 roasted, 2 planned), `RoastLog → Person (roaster)`, Table and Kanban views.

### Collections

- The root collection holds 3 collections: Welcome (Space Tour, About), Reference (wholesale terms,
  cupping notes, two sheets), Roastery Handbook (floor plan, tasting protocol). The test's count of 4
  includes the root.

## Checks

- 128 objects. Per type: organization 6, person 9, view 5, table 2, kanban 2, map 1, mailbox 1,
  message 41, calendar 1, event 9, feed 3, project 4, instructions 5, routine 1, trigger 1, taskSet 4,
  task 23, milestone 5, document 7, drawing 2, sheet 2, collection 4.
- Wholesale terms' parent is the Reference collection; Olive & Vine lists it as an artifact.
- The floor plan's parent is Roastery Ops; Roastery Handbook lists it.
- Every trigger is disabled.
- Exactly one stored schema, with 8 roast-log rows.

## Gaps

- Mail senders and event attendees are Actors, not Refs to `Person`. Opening a sender does not reach
  the contact unless the inbox resolves it by email.
