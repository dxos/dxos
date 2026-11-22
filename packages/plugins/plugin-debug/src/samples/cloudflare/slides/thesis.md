---
title: 'The shift'
layout: 'default'
---

# The agentic future needs a new kind of cloud

<Grid cols="2">

<Cell>

- **Data:** trapped in silos, with no shared truth

</Cell>
<Cell>

897 apps in the average enterprise; 29% are connected.

</Cell>
<Cell>

- **Generation without rails:** more apps, more silos, nobody to operate them

</Cell>
<Cell>

Chad Fowler: "Standardize the slow layers. Generate the fast layers."

</Cell>
<Cell>

- **Closed systems:** whoever owns the interface owns the data

</Cell>
<Cell>

Salesforce put its CRM inside Claude. Benioff: "the UI is the AI."

</Cell>
<Cell>

- **Teams:** agents as trusted collaborators, not one user's assistant

</Cell>
<Cell>

Block's Buzz, Multica, and YC's call for "multiplayer AI".

</Cell>
<Cell>

- **Control:** direct, review and undo, on any device or by voice

</Cell>
<Cell>

DeepSeek's super agent: always on, delegating; people can follow only 3 to 5 sessions.

</Cell>

</Grid>

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
- The issues: five themes on the slide, seven points underneath. Each sets up a layer on the next slide.
  - Data = silos and access + no shared truth.
  - Generation without rails.
  - Closed systems.
  - Teams = collaboration.
  - Control = beyond chat + every mode (desktop, phone, voice, video).
  - Silos and access. The average enterprise runs 897 applications and only 29% are connected (MuleSoft, 2025). Companies using agents have more apps (1,103) and more silo trouble (94% vs 87%). Your post: "Agents need to understand the context of the company and be able to reach the systems people use to do their jobs." And on access: "handing over API keys to people and agents is dangerous and does not scale." [Sets up: ECHO, one data surface with access control.]
  - No shared truth. Even when an agent can reach the data, each app models a customer or a task differently. Fowler: without someone owning the slow layer you get a thousand locally sensible apps that disagree about basic facts. DeepSeek: long-term memory becomes the bottleneck after months.
    - Acknowledge Agent Memory. You are ahead of everyone here: "a managed service that extracts information from agent conversations and makes it available when it's needed, without filling up the context window", and a profile is "an isolated memory store shared across sessions, agents, and users". It extracts facts, events, instructions and tasks. It is the right answer for recall, and we would use it.
    - Your own post is candid about what is open. "Context rot remains an unsolved problem." It is in private beta, and you are "continuing to test and refine" it. Recall returns an answer; querying the data directly is "likely" to come "down the road". And customers have a "growing concern" about tying that asset "to a single vendor, which is reasonable".
    - How we see the two fitting. Memory is what an agent learned from conversations: facts it extracted, recalled as an answer. A record is what the team agreed: a typed object, with an author and a history, that an app can query and a person can edit. Memory is what an agent remembers; the shared truth is what the organization holds. They are complementary, and memory is better when it is grounded in records. [Sets up: ECHO, one semantic model; Agent Memory beside it, not replaced by it.]
  - Generation without rails. Vibe coding makes more apps, so more silos. And it doesn't hold up over time. Fowler: "Companies will still pay other companies to host important software, secure it, operate it, maintain authoritative data, track regulatory changes, connect to external networks, and answer the phone when something breaks." And: "If every variation is an unconstrained snowflake, mass-customized SaaS collapses under its own operational cost." Veracode tested 100+ models: generated code had security flaws in 45% of cases. Your post says the same: "Security had to be part of the platform", not left to every person building an app. His rule: "Standardize the slow layers. Generate the fast layers." [Sets up: the framework.]
  - Closed systems. The labs are absorbing the apps, and whoever owns the interface ends up owning the data. In 2025 Salesforce changed the Slack API terms to bar bulk export, indexes and "the usage of such data in large language models"; Glean told customers it hampered "your ability to use your data with your chosen enterprise AI platform". Diginomica on Benioff: "so whose AI is the UI?" Your answer in Cloudflare OS: "designed to belong to the company running it", "can be used with any model". We agree. [Sets up: an open super app, on Cloudflare.]
  - Collaboration. Today's agents are one user's assistant. Work is done in teams, so an agent needs an identity, a role, and shared context. Your post: "Collaboration exposed a more fundamental challenge." DeepSeek lists context boundaries across permission limits as open. [Sets up: spaces, with people and agents as members.]
  - Beyond chat. Agents run for hours, in the background, many at once. DeepSeek: people can follow only three to five sessions; human attention is now the limit. Chat is the control plane; people also need to see the execution plane: what ran, on what, and how to undo it. Your post: "When a document or spreadsheet is not enough, the agent can build an app." [Sets up: the super app.]
  - Every mode. The same data and operations from a laptop, a phone, or by voice, and when offline. An agent that stops when the laptop closes isn't part of the team. [Sets up: a copy on every device.]
- I saw the early version of the silo problem at Google Apps: Mail, Docs and Calendar shared a login and not much else.
- So: what should the durable layer be? The rails. Next slide.
-->
