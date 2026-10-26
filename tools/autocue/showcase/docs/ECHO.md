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
   - It was a consequence of the old software economics.
   - Now apps are easy to build, and agents need all of our data to be useful.
   - That demands a new security model.

2. **Monolithic Agents** (13–23s, 30 words)

   - Today we grant agents coarse access to everything, with no audit and no control.
   - As agents run continuously, across both private and enterprise data, that becomes more dangerous every day.

3. **ECHO Graph Database** (23–33s, 24 words)

   - ECHO takes a different approach.
   - It brings all your data into a single logical graph, so people and agents work from the same context.

4. **ECHO Hypergraph** (33–43s, 30 words)

   - That graph is partitioned into secure spaces.
   - Share each one with the colleagues and agents who need it, even across organizations, and every agent sees only what its task requires.

5. **Open and Extensible** (43–60s, 36 words)

   - And because it's open, it keeps growing.
   - New sources, new apps and new agents plug into the same graph, and you never give up control.
   - DXOS is the operating system for people and agents working together.

## Previous narration (for reference)

The lines `flow-cues.json` speaks today, one per slide:

1. "Today, your data is split across vendors. Mail, documents, finance and operations each live in their own app,
   rented back to you."
2. "Agents present new opportunities and challenges. To be useful, they need everything, so we grant them unrestricted
   access to all of it."
3. "DXOS takes a different path. ECHO brings your data into one graph you own, organized and indexed by context."
4. "That graph is partitioned into secure spaces, so each user, team, app and agent sees only the data they need."
5. "And because it's open, it keeps growing. New sources, new apps and new agents plug into the same foundation,
   without ever giving up control. DXOS is the enterprise operating system."
