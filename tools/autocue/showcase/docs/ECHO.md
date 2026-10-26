# ECHO video (60s): talking points

Talking points for each slide of the ECHO explainer (`ECHO.m4v`, rendered from `temp/flow-60s.mp4` in the
`data-molecule-animation` worktree), and the spoken script under [Script](#script). Points marked _(verify)_ make a
claim that needs checking against the code before it is spoken.

## 0. Open: DXOS (0–3s)

- No narration; the logo holds while the music starts.

## 1. The Silo Problem (3–13s)

- Data silos are decades old: they are the natural result of the way SaaS has always been built.
- Each app keeps its own copy of your data, in its own format, on its own servers.
- Two things have changed.
- First, SaaS is now easy to build, so the number of apps, and of silos, keeps growing.
- Second, agents are only as useful as the data they can reach: to be at their best, they need all of it.
- Giving agents that access safely is essential, and it needs a new security model.

## 2. Monolithic Agents (13–23s)

- Today users grant agents coarse-grained access: one all-or-nothing grant per app.
- Once granted, the agent can read and change everything behind it.
- There is no audit of what an agent read or changed, and no control over how it uses the data.
- The risk grows as agents run continuously, rather than answering one prompt at a time.
- It grows again as those agents mix private data with enterprise data.
- The more agents we run, the more dangerous this approach becomes.

## 3. ECHO Graph Database (23–33s)

- ECHO brings your data into a single logical graph.
- Mail, documents, finance and operations become typed objects in that one graph, not copies in separate apps.
- References link objects across what used to be separate apps, so context is kept, not lost.
- People and agents query the same graph, so an agent sees the same context a person does.
- Local-first: the graph lives on your devices and works offline.
- Changes from many people and agents merge automatically, in real time.

## 4. ECHO Hypergraph (33–43s)

- The single graph is partitioned into secure containers, called spaces.
- Each space is shared with exactly the colleagues and agents who need it.
- An agent joins only the spaces its task needs, so its access is fine-grained, not all-or-nothing.
- Spaces can span organizational boundaries: a space can be shared with a customer, a partner or a contractor.
- Objects can reference each other across spaces, so the graph stays one logical whole.
- Every change in a space is attributed to the person or agent who made it. _(verify)_

## 5. Open and Extensible (43–60s)

- New data sources plug in: mail, chat, calendars, code, and anything with an API.
- New apps are plugins over the same graph: documents, sheets, canvases, boards, maps, projects.
- Agents work through the same open operations, and over MCP, as people do. _(verify the MCP wording)_
- Composer is the app built this way, and every plugin is an example of what you can build.
- Open source and open protocols, so your data is never locked in.
- DXOS is the enterprise operating system for people and agents working together.

## 6. Close: Sovereign Intelligence (60–63s)

- "Sovereign Intelligence." Your data, your agents, your control.
- Join the community at dxos.org/discord.

## Script

The spoken lines, one bullet per line read; each slide starts at its time in the 60s source render (3s earlier than in
`ECHO.m4v`). `cues.mjs` builds [`cues/echo.json`](cues/echo.json) and the prompter's cues from this section. About
25 words fits a 10s slide.

1. **The Silo Problem** (at 0.5s)
   - Enterprise data has been siloed for decades;
   - this was a consequence of SaaS software economics.
   - But agents need a unified view across the organization to be effective.
   - And this demands a new data and security model.

2. **Monolithic Agents** (at 10.5s)
   - Today, agents access our data through point-to-point connections with broad permissions.
   - This approach is risky, and simply doesn't work for agents that run continuously with evolving requirements.

3. **ECHO Graph Database** (at 20.5s)
   - DXOS takes a fundamentally different approach.
   - Enterprise, team, and personal data all connect into a virtual semantic graph.
   - And Composer brings this together as an extensible super app, replacing dozens of separate tools.

4. **ECHO Hypergraph** (at 30.5s)
   - The graph is partitioned into interconnected workspaces;
   - enabling teams and agents to work within a secure shared context.
   - Workspaces are flexible containers, drawing in data from different sources as plans and tasks evolve.

5. **Open and Extensible** (at 40.5s)
   - Open by design, Composer lets teams and agents build and customize apps, plugins and skills.
   - And the entire stack runs on Cloudflare Workers, so it's secure, cost-effective, and scales on demand.
   - DXOS is the operating system for the new enterprise.

## Composer Demo

- Composer is an open and extensible super app

45s

- user edits document and writes a comment to a colleague
- then assigns a task to an agent, which creates a diagram
- then views and edits a drawing
- then inserts a spreadsheet into the document
- then navigates to the sheet to see a chart

15s

- we use it as a harness to drive first tier and open models
- the entire composer software development experience is managed via the app

60s

- we also use it for email, calendar, meetings, and CRM

10s

- the entire platform is open and extensible
- made up from over 100 plugins that contribute user interface modules, agents skills, and connectors to external systems

### Script (draft)

The spoken lines for the Composer demo, one bullet per line read, in the same layout as [Script](#script). Times
assume the demo opens on a 4.5s title; the sections add up to 130s against the current 127s cut, so the picture
stretches to the voice as for ECHO. Lines marked _(verify)_ make a claim to check against the cut.

1. **Documents**
   - This is Composer: an extensible super-app for teams and their agents.
   - Your data is organized into collaborative workspaces and accessed via plugins.
   - You can add comments to any object; and assign tasks to agents, which read and update data in real time.
   - Documents can incorporate components from any plugin.
   - The plugin registry contains dozens of rich components, ready to drop into any workspace.
   - And every plugin brings new tools, skills and connectors for your agents.
   - Documents, diagrams, tables, and kanbans are all objects in the same graph.

2. **Agents**
   - At DXOS we use Composer as a coding harness with both frontier and open models.
   - In fact, Composer's own development, including its plans, tasks and agents -- are all designed, developed and extended from inside the app.

3. **Email, calendar, meetings and CRM**
   - We run the rest of the business in Composer also.
   - Email arrives in the same graph, so every message is linked to the appropriate people and organization objects.
   - And the CRM is simply another view of the same data, for people and agents alike.
   - The calendar holds our meetings; with automated summaries including links to generated artifacts.
   - Meetings are captured, and agents turn them into notes, plans, and follow-ups.

4. **Open and extensible**
   - The entire platform is open and extensible.
   - Your data, your apps, your agents, all in one place, and all under your control.
