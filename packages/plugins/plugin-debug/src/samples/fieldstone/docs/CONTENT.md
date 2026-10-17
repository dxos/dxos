# Alien Labs documents

The team's shared documents: handbook, architecture, incident write-ups, planning and customer
notes, with the sheets and drawings they embed. Every document links people and other content inline,
so reading one leads to the next.

- Code: this directory: `partial.ts`, `documents.ts`, `sheets.ts`, `drawings.ts`, `partial.test.ts`
- Requires: [team](../team/CONTENT.md) (`orgs.fieldstone`, `people.*`)
- Optional:
  - [inbox-crm](../inbox-crm/CONTENT.md): the customer notes, and the links to vendors, customers and
    contacts.
  - [projects](../projects/CONTENT.md): the links to projects, tasks and project artifacts, and the
    roadmap's TaskSet embed.
  - Architecture, from plugin-canvas (`Architecture.Partial`): the links to its Composer and EDGE
    guides and the embeds of its `composer-plugin` and `edge-compute` drawings in `architecture`.
- Provides: `docs.<key>`, `sheets.<key>`, `drawings.<key>`
- Clock: sync notes and the incident timeline use offsets from −60d to the reference date. The decision
  log reaches back to −120d, the hiring sheet's open dates to −80d, the vendor spend sheet over the 12
  months ending in the reference month, and the roadmap drawing over the reference date's quarter.
- Used by: a Alien Labs template, not written yet

## Contents

### Documents

- 15 `Markdown.Document`. Links are inline `[label](echo:///<id>)`; embeds are `![label](echo:///<id>)`
  blocks.
- Messages and events live in feeds. An embed of one renders its card, but opening a feed item from
  a document does not navigate, so documents embed them and never link them, and no flow opens one.
- Handbook:
  - `handbook` Team handbook: links every person; embeds `orgChart`.
  - `onboarding` Engineer onboarding: links Hana, Omar, Felix, Anika and `architecture`; embeds
    `architectureDiagram`. With projects, links `artifacts.cacheDesign`.
  - `runbook` On-call runbook: links Anika; embeds `escalation` and `cloudCost`. With inbox-crm,
    links Cloudflare.
  - `architecture` Cairn architecture: links Omar and Felix; embeds `architectureDiagram` and
    `requestFlow`; one mermaid sequence diagram of a cache lookup. A "Cairn on DXOS" section says
    the dashboard is a Composer plugin and the agents run on EDGE compute, and that Cairn's edge
    gateway is its own worker, not EDGE. With Architecture, its two subsections link the Composer and
    EDGE guides inline and embed the `composer-plugin` (Plugin Anatomy) and `edge-compute` drawings.
    Without it, the same text reads without the links and embeds.
  - `decisions` Decision log, 8 entries: each names its deciders, links the docs it changed, and has
    a context, the decision, two alternatives considered and its consequences. With projects, 2
    entries link `artifacts.cacheDesign`.
- Planning:
  - `roadmap` Q4 roadmap: embeds `roadmap`. With projects, links each project and embeds
    `taskSets.cache`.
  - `hiring` Hiring plan: links Astrid and Lucía; embeds `hiring`.
  - `pricing` Pricing and plans: embeds `pricing`. With inbox-crm, links Stripe. With projects, links
    `artifacts.billingPlan`.
  - `vendors` Vendors and spend: embeds `vendorSpend` and `cloudCost`. With inbox-crm, links each
    vendor and its contact.
- Incidents:
  - `postmortem` Okapi cache-corruption postmortem: links Omar and Anika; embeds `incidentTimeline`.
    With inbox-crm, links Okapi, Nadia and Sam and embeds the first `okapiIncident` message. With
    projects, links the cache-key collision task.
- Customers, built only with inbox-crm:
  - `customer.<key>` one note per customer (Northpine, Meridian, Okapi, Brightwater): links the
    organization and its contacts, and lists open asks. With projects, the Meridian note links `soc2`.
- Meetings:
  - `syncNotes` Team sync notes: one dated section for each of the last 4 team syncs, each linking the
    people who own its action items. With inbox-crm, the sections are the last 4 `teamSync` events
    that start before the reference date, and each embeds its event. Without it, they are dated to
    the last 4 Mondays at 10:00.

### Sheets

- 5 `Sheet`, with formulas wherever a column is derived:
  - `pricing` Plans by tier and usage, 4 tiers × 6 columns, monthly price computed from usage
  - `vendorSpend` Monthly spend per vendor over 12 months, with row and column totals
  - `cloudCost` Cloudflare cost forecast (compute and S3, Workers and R2) for the next 6 months, growth by formula
  - `incidentTimeline` The Okapi incident, 20 timestamped rows from detection (−35d) to close (−25d),
    hours since detection by formula
  - `hiring` Open roles by stage, 5 roles, with days open computed from the open date: an "As of"
    cell holds the reference date, and both dates are `DATE()` formulas so the sheet can subtract them

### Drawings

- 5 `Drawing.Drawing`, each a tldraw canvas (`Tldraw.TLDRAW_SCHEMA`) built with
  `TldrawModel.RecordBuilder` from shapes and bound arrows. Canvas-renderer drawings, like the
  architecture content, need plugin-canvas internals that are not exported:
  - `orgChart` Alien Labs' 10 people and who reports to whom
  - `architectureDiagram` Cairn's services and stores; the dashboard box is the Composer plugin
  - `requestFlow` One cache request, client to storage and back
  - `roadmap` Q4 on a timeline, one lane per project
  - `escalation` The on-call escalation path

### Collections

- Handbook: `handbook`, `onboarding`, `runbook`, `architecture`, `decisions`, `orgChart`,
  `architectureDiagram`, `requestFlow`, `escalation`
- Planning: `roadmap`, `hiring`, `pricing`, `vendors`, the `roadmap` drawing, and the `pricing`,
  `vendorSpend`, `cloudCost` and `hiring` sheets
- Incidents: `postmortem`, `incidentTimeline`
- Customers: the 4 customer notes, with inbox-crm
- Meetings: `syncNotes`

## Flows

1. Open the handbook, click a person's link, open their contact.
2. Open `architecture`, open the embedded `requestFlow` drawing, come back.
3. Open `postmortem`, scroll the embedded incident timeline, follow the link to Okapi.
4. With projects: open `roadmap`, open a project from its link, see its Gantt.

## Checks

- 15 documents, 5 sheets, 5 drawings with the full template; 11 documents without inbox-crm.
- Every document has at least 2 inline links.
- Every sheet and drawing is embedded in at least one document. At least 12 embeds in all.
- Every link and embed resolves to an object in the space.
- No link targets content from a partial the template leaves out.
- With Architecture, `architecture` links its Composer and EDGE guides and embeds its
  `composer-plugin` and `edge-compute` drawings.
- Every sheet with a derived column computes it by formula.
