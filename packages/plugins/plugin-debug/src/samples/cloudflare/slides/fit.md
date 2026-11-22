---
title: 'What we add'
layout: 'default'
accent: 'rgb(246,130,31)'
class: 'studio-bullets-compact'
---

# Opportunity: The Enterprise OS

<Grid cols="3" align="center">

<Card icon="app-window" tone="neutral">

### Super app<br>&nbsp;

</Card>
<Cell colSpan="2">

- One hub that unifies teams and agents across the enterprise
- Where Claude Cowork is heading, but open and extensible
- What WeChat did for consumers, for work

</Cell>
<Card icon="puzzle-piece" tone="success">

### App Framework<br>(PLEX)

</Card>
<Cell colSpan="2">

- What iOS did for mobile: one framework redefined how apps are built
- Quality enforced: standard components, one look and feel
- OS-like services for every app: access, search, sharing, undo

</Cell>
<Card icon="database" tone="info">

### Data Model<br>(ECHO)

</Card>
<Cell colSpan="2">

- One virtual view of all the data: private, team, organization, external
- One semantic model for apps and agents, with access control for both
- Syncs with external systems of record on demand

</Cell>
<Card icon="cloud">

### Runtime<br>(Cloudflare)

</Card>
<Cell colSpan="2">

- The edge: secure, fast, scales on demand, pay for what you use
- Without the complexity of AWS or Google Cloud
- Every model through one API, frontier and open-weight

</Cell>

</Grid>

<!--
Notes. 1:45
- What the enterprise needs from the durable layer. Five things. (Moved here from slide 3.)
  - Modular, interoperable parts. The part you add tomorrow works with the data you made today. Modules on one core, not integrations between silos. That is also what makes a marketplace possible.
  - One data surface. Virtual and federated: across teams, organizations and outside sources, but one model to query. An agent is only as useful as the data it can reach.
  - Shared controls. Auth, access, policy, audit: cross-cutting, so they have to live below the apps. Fowler asks for "common identity and authorization, telemetry, deployment controls".
  - Standard components and idioms. Documents, sheets, boards, workflows. Nobody should generate these from scratch; they should customize and extend them.
  - Every mode. The same data and operations from desktop, phone and voice, for people and for agents.
- That is this stack. Four layers. Each has a precedent: the most successful thing of its kind. Read from the bottom; the middle two are ours.
- Cloudflare. In your own words: Workers "scale automatically from zero to millions of requests", run in 330+ cities, on "systems powering 20% of the Internet", and you "pay only for execution time". "No load balancers, no capacity planning, no regional configuration": that is the answer to AWS and Google Cloud. And models: "70+ models across 12+ providers, all through one API", frontier and open-weight. Cloudflare is not a model lab, so an enterprise isn't locked to one. Cloudflare OS is the runtime for agents, compute and policy; where we overlap, we defer to it.
- ECHO. Enterprises have wanted one view of their data for thirty years: warehouses, master data, the semantic web, data fabric. It never arrived because mapping every system by hand was too expensive. Agents change that: they can do the mapping, and pull from a system of record on demand.
  - The closest thing that worked is Palantir's Ontology: "an operational layer for the organization", "a digital twin of the organization", objects and actions that every app builds on. It is closed and installed by consultants. ECHO is the open, developer-first version, and it lives on every device.
  - One virtual view: private, team, organization, external. One semantic model that apps and agents share; it is the membrane apps are built on, and it is what makes them interoperate. Access control for people and agents alike.
  - Cloudflare OS gives each app its own database; ECHO gives every app and agent the same graph.
- PLEX. The precedent is iOS. One framework (UIKit) redefined how apps were built. It enforced quality: standard components, one look and feel. And it gave every app the OS-level services for free: permissions, notifications, sharing, search, payments. Result: an ecosystem that did $1.4 trillion in billings and sales in 2025. [Earlier analogy, if useful: Visual Basic, components plus built-in data.]
  - PLEX does that for enterprise apps: plugins composed from standard components, with access, search, sharing, history and undo provided underneath. And agents build parts too.
- Super app. One hub that unifies teams and agents across the enterprise. This is where Claude Cowork is heading: VentureBeat called it "a shared, persistent workspace where context, files, and tasks live beyond a single user session". The labs will absorb the apps. Ours is the same destination, but open and extensible, and not tied to one model vendor. The consumer precedent is WeChat: one app, millions of mini programs. [Check the figure before citing a number.]
- People have tried the hub before (portals, intranets, Notes, Wave). What is different now: code is cheap, and agents need one place and one data model to be useful.
- This is our reading of where your posts point. Correct it where we're wrong.
-->
