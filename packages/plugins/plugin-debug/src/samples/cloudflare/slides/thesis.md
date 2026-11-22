---
title: 'The shift'
layout: 'two-cols-header'
---

# The application layer is being absorbed

::left::

### The signals

- The Labs are absorbing the entire app layer.
- Salesforce put its CRM inside Claude. Benioff: "the UI is the AI."
- Cloudflare: "the agentic future needs a new kind of cloud."
- Agents are joining teams: Block's Buzz, Multica, and YC's call for "multiplayer AI".
- DeepSeek's design for a super agent: always on, delegation, with memory the open problem.

::right::

### The open problems

- **Silos and access:** data is trapped per app; an agent reaches only a slice
- **No shared truth:** apps and agents disagree on basic facts; memory doesn't last
- **Generation without rails:** more apps, more silos; no enterprise wants to operate its own critical software
- **Closed systems:** whoever owns the interface ends up owning the data
- **Collaboration:** trusted agents working inside a team, not one user's assistant
- **Beyond chat:** a place to direct, review and undo what agents do
- **Every mode:** laptop, phone, voice; online or off

<!--
Notes. 2:00
- This is the opening technical slide. Frame: these are problems we both see. Several are in your own Cloudflare OS post.
- The shift: four generations of AI in two years.
  - Chat: call and response. Search, smart autocomplete, hallucinations.
  - Copilot: the model had memorized GitHub; it moved into the IDE and started producing artifacts.
  - Cowork: OAuth and MCP connect it to your tools; playgrounds and gadgets; triggers. Still single user.
  - Super agents: long-running, autonomous, multiplayer, swarms. The agent becomes part of the team.
- Each step absorbs more of the application layer.
- The signals. Salesforce's Claudeforce: Benioff, "Here, the UI is the AI"; Patrick Stokes, "The value of Salesforce is not in our UI itself. It's not the application." Agents are joining teams: Buzz, Multica, YC's "multiplayer AI". DeepSeek names long-term memory as the bottleneck. And Matthew on the Q2 call: "the agentic future needs a new kind of cloud."
- The open problems. Each one sets up a layer on the next slide.
  - Silos and access. The average enterprise runs 897 applications and only 29% are connected (MuleSoft, 2025). Companies using agents have more apps (1,103) and more silo trouble (94% vs 87%). Your post: "Agents need to understand the context of the company and be able to reach the systems people use to do their jobs." And on access: "handing over API keys to people and agents is dangerous and does not scale." [Sets up: ECHO, one data surface with access control.]
  - No shared truth. Even when an agent can reach the data, each app models a customer or a task differently. Fowler: without someone owning the slow layer you get a thousand locally sensible apps that disagree about basic facts. DeepSeek: long-term memory becomes the bottleneck after months. [Sets up: ECHO, one semantic model.]
  - Generation without rails. Vibe coding makes more apps, so more silos. And it doesn't hold up over time. Fowler: "Companies will still pay other companies to host important software, secure it, operate it, maintain authoritative data, track regulatory changes, connect to external networks, and answer the phone when something breaks." And: "If every variation is an unconstrained snowflake, mass-customized SaaS collapses under its own operational cost." Veracode tested 100+ models: generated code had security flaws in 45% of cases. Your post says the same: "Security had to be part of the platform", not left to every person building an app. His rule: "Standardize the slow layers. Generate the fast layers." [Sets up: the framework.]
  - Closed systems. The labs are absorbing the apps, and whoever owns the interface ends up owning the data. In 2025 Salesforce changed the Slack API terms to bar bulk export, indexes and "the usage of such data in large language models"; Glean told customers it hampered "your ability to use your data with your chosen enterprise AI platform". Diginomica on Benioff: "so whose AI is the UI?" Your answer in Cloudflare OS: "designed to belong to the company running it", "can be used with any model". We agree. [Sets up: an open super app, on Cloudflare.]
  - Collaboration. Today's agents are one user's assistant. Work is done in teams, so an agent needs an identity, a role, and shared context. Your post: "Collaboration exposed a more fundamental challenge." DeepSeek lists context boundaries across permission limits as open. [Sets up: spaces, with people and agents as members.]
  - Beyond chat. Agents run for hours, in the background, many at once. DeepSeek: people can follow only three to five sessions; human attention is now the limit. Chat is the control plane; people also need to see the execution plane: what ran, on what, and how to undo it. Your post: "When a document or spreadsheet is not enough, the agent can build an app." [Sets up: the super app.]
  - Every mode. The same data and operations from a laptop, a phone, or by voice, and when offline. An agent that stops when the laptop closes isn't part of the team. [Sets up: a copy on every device.]
- I saw the early version of the silo problem at Google Apps: Mail, Docs and Calendar shared a login and not much else.
- So: what should the durable layer be? The rails. Next slide.
-->
