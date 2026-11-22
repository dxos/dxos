---
title: 'Thesis'
layout: 'default'
---

# Enterprise software needs rails

<Grid cols="2">

<Cell>

### What the enterprise needs

- **Modular, interoperable parts:** anything added works with the data already there
- **One data surface:** federated across teams and sources, no silos
- **Shared controls:** auth, access, policy and audit, built once
- **Standard components:** documents, sheets, boards, workflows, open to customize and extend
- **Every mode:** desktop, phone, voice

</Cell>
<Cell>

### The signals

- Salesforce put its CRM inside Claude. Benioff: "the UI is the AI."
- Every chat product now generates small apps on request, each with its own state.
- Agents are joining teams: Block's Buzz, Multica, and YC's call for "multiplayer AI".
- DeepSeek's design for a super agent: always on, delegating, with memory the open problem.

</Cell>

</Grid>

<!--
Notes. 1:30
- Software is changing. SaaS grew up as point solutions: one vendor, one database, one process, the same for every customer.
- Chad Fowler, "SaaS Isn't Dead. Sameness Is.": "Companies will still pay other companies to host important software, secure it, operate it, maintain authoritative data, track regulatory changes, connect to external networks, and answer the phone when something breaks." What goes away is every customer running the same app. His rule: "Standardize the slow layers. Generate the fast layers."
- Why vibe coding alone doesn't work. Each generated app is an island: its own state, its own login, nobody to test, secure or support it. Fowler: "If every variation is an unconstrained snowflake, mass-customized SaaS collapses under its own operational cost." And: "Cheap variation is safe only when something durable constrains it."
- So what is the durable layer? Five things.
  - Modular, interoperable parts. The part you add tomorrow works with the data you made today. Modules on one core, not integrations between silos. That is also what makes a marketplace possible.
  - One data surface. Virtual and federated: across teams, organizations and outside sources, but one model to query. An agent is only as useful as the data it can reach.
  - Shared controls. Auth, access, policy, audit: cross-cutting, so they have to live below the apps. Fowler asks for "common identity and authorization, telemetry, deployment controls".
  - Standard components and idioms. Documents, sheets, boards, workflows. Nobody should generate these from scratch; they should customize and extend them.
  - Every mode. The same data and operations from desktop, phone and voice, for people and for agents.
- I saw the early version at Google Apps: Mail, Docs and Calendar shared a login and not much else.
- The signals. Salesforce's Claudeforce: Benioff, "Here, the UI is the AI"; Patrick Stokes, "The value of Salesforce is not in our UI itself. It's not the application." The value is the data underneath. Agents are joining teams: Buzz, Multica, YC's "multiplayer AI". DeepSeek names long-term memory as the bottleneck.
- Where this points: a framework on a shared data layer, which is ECHO, and on top of it a super app. Next slide.
-->
