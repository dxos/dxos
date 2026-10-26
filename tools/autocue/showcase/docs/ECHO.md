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

The spoken lines, one bullet per sentence; [`cues/echo.json`](cues/echo.json) is built from this section (its times are in
the 60s source render, 3s earlier than in `ECHO.m4v`). About 25 words fits a 10s slide.

1. **The Silo Problem** (3–13s, 38 words)

   - SaaS has siloed our data for decades.
   - This was a consequence of cloud software economics.
   - But today apps are easier to build, and agents need all of our data to be useful.
   - That demands a new data and security model.

2. **Monolithic Agents** (13–23s, 30 words)

   - Today we grant agents coarse-grained access to everything, with no audit and limited control.
   - REDO: As agents run continuously, across both private and enterprise data, that becomes more dangerous every day.
     - Variant A (14 words): That is risky, and it doesn't scale: always-on agents need scoped access, not all-or-nothing.
     - Variant B (18 words): It's risky, and it breaks down for always-on agents, which need the right data, not all of it.
     - Variant C (14 words): That approach is risky, and it simply doesn't work for agents that run continuously.
     - Variant D (15 words): It doesn't scale: for always-on agents, all-or-nothing access is both too risky and too blunt.

3. **ECHO Graph Database** (23–33s, 24 words)

   - ECHO DB takes a fundamentally different approach.
   - It brings all your data into a single logical graph, so teams and agents can work from a shared context.

4. **ECHO Hypergraph** (33–43s, 30 words)

   - That graph is partitioned into interconnected secure spaces.
   - REDO: Share each one with the colleagues and agents who need it, even across organizations, and every agent sees only what its task requires.
     - Variant A (16 words): Each space is shared with exactly the colleagues and agents who need it, even across organizations.
     - Variant B (17 words): Spaces can be shared with colleagues, partners and agents, so each one sees only what it needs.
     - Variant C (16 words): Grant a colleague, a partner or an agent access to just the spaces their work requires.
     - Variant D (17 words): Spaces span teams and organizations, and every agent is scoped to exactly the data its task needs.

5. **Open and Extensible** (43–60s, 36 words)

   - REDO: And because it's open, it keeps growing.
   - REDO: New sources, new apps and new agents plug into the same graph, and you never give up control.
   - DXOS is the operating system for the new enterprise.
