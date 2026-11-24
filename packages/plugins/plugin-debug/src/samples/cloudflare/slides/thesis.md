---
title: 'The shift'
layout: 'default'
class: 'studio-lines-tight'
---

# The agentic future needs a new kind of cloud

<Grid cols="2">

<Cell>

- **Data:** trapped in silos, with no shared truth and no common access control

</Cell>
<Cell>

- Cloudflare OS: "Agents need to understand the context of the company."

</Cell>
<Cell>

- **The cost of free software:** generated apps still have to be secured, operated and maintained

</Cell>
<Cell>

- Benioff: "Here, the UI is the AI — allowing you to build custom apps dynamically and answer any enterprise question."

</Cell>
<Cell>

- **Teams:** agents as trusted collaborators, not one user's assistant

</Cell>
<Cell>

- Block's Buzz, Multica, and YC's call for "multiplayer AI".

</Cell>
<Cell>

- **Control:** direct, review and undo, on any device or by voice

</Cell>
<Cell>

- DeepSeek's super agent: always on, delegating; people can follow only 3 to 5 sessions.

</Cell>
<Cell>

- **Closed systems:** whoever owns the interface controls the data

</Cell>
<Cell>

- Salesforce put its entire CRM inside Claude.

</Cell>

</Grid>

<!--
Notes. 2:30
- The title is Matthew's line from the Q2 call. Frame: these are problems we both see; several are in your own Cloudflare OS post. Five points.
- First, how we got here: four generations of AI in two years.
  - Chat: call and response. Search, smart autocomplete, hallucinations.
  - Copilot: the model had memorized GitHub; it moved into the IDE and started producing artifacts.
  - Cowork: OAuth and MCP connect it to your tools; playgrounds and gadgets; triggers. Still single user.
  - Super agents: long-running, autonomous, multiplayer. The agent becomes part of the team.
- 1. Data.
  - The silo problem is decades old: warehouses, master data, integration projects. What is new is that an agent needs access to everything to be useful. Your post: "Agents need to understand the context of the company and be able to reach the systems people use to do their jobs."
  - Then: what is canonical? The record in a database, what somebody said in a chat thread, or what the model picked up in training. Those disagree, and today nothing says which one wins.
  - Agent Memory is the right answer for recall: "a managed service that extracts information from agent conversations and makes it available when it's needed". We would use it. Your post is candid about what is open: "context rot remains an unsolved problem", and querying the data directly is "likely" to come "down the road". Memory is what an agent remembers; the record is what the organization holds. They are complementary.
  - And access control. Most companies have ad hoc policy: per app, per integration, per key. Your post: "handing over API keys to people and agents is dangerous and does not scale." "Keys often provide broad, long-lived access that is difficult to constrain, share safely, and audit."
- 2. The cost of free software.
  - Why vibe coding doesn't work on its own. Code is now free to write. It is not free to secure, operate and maintain. Every generated app is another silo, and somebody has to own it. Veracode tested 100+ models: generated code had security flaws in 45% of cases.
  - Why SaaS hasn't gone away. Chad Fowler: "Companies will still pay other companies to host important software, secure it, operate it, maintain authoritative data, track regulatory changes, connect to external networks, and answer the phone when something breaks." What goes away is every customer running the same app.
  - His rule: "Standardize the slow layers. Generate the fast layers." Your post agrees: "Security had to be part of the platform", not left to each person building an app.
- 3. Teams.
  - Today's agents are one user's assistant. Work is done in teams, so an agent needs an identity, a role and shared context, like any other member. Your post: "Collaboration exposed a more fundamental challenge."
  - Others see it: Block's Buzz, Multica, YC's call for "multiplayer AI".
  - We will show some of how we approach this in the demo.
- 4. Control.
  - We started with chat, and chat is one mode among several. The scenarios differ: question and answer; composition (a document, a deck, an app); research; pipelines that run on a trigger; delegation of a task that runs for hours.
  - Each needs a different surface, and all of them need a way to direct, review and undo. DeepSeek's super-agent paper: people can follow only three to five sessions; human attention is now the limit.
  - And from any device: desktop, phone, voice, video.
- 5. Closed systems. The closing point.
  - The labs are eating the application layer. Salesforce put its CRM inside Claude; Benioff: "Here, the UI is the AI". Their own Patrick Stokes: "The value of Salesforce is not in our UI itself. It's not the application."
  - Whoever owns the interface ends up controlling the data. In 2025 Salesforce changed the Slack API terms to bar bulk export, indexes and "the usage of such data in large language models".
  - Your answer in Cloudflare OS: "designed to belong to the company running it", "can be used with any model". We agree, and that is why we are here.
- I saw the early version of the silo problem at Google Apps: Mail, Docs and Calendar shared a login and not much else.
- So what should the durable layer be? Next slide.
-->
