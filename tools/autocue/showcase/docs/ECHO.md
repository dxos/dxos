# ECHO video (60s): talking points

Candidate points for each slide of the ECHO explainer (`ECHO.m4v`, rendered from `temp/flow-60s.mp4` in the
`data-molecule-animation` worktree). Pick two or three per slide for the spoken line; each slide has about 10s,
so about 25 words. Points marked _(verify)_ make a claim that needs checking against the code before it is spoken.

## 0. Open: DXOS (0–3s)

- No narration; the logo holds while the music starts.

## 1. The Silo Problem (3–13s)

- Every kind of work lives in a different vendor's app: mail, documents, finance, operations.
- Each vendor keeps its own copy of your data, in its own format, on its own servers.
- You rent access to your own data, and lose it when you stop paying or the vendor shuts down.
- Nothing connects the silos: the same customer, project or decision is scattered across them.
- Integrations are point-to-point glue that each team builds and maintains for itself.
- Context, which is what makes data useful, is lost at every boundary.

## 2. Monolithic Agents (13–23s)

- Agents are the new way to get work done, and to be useful they need context from everywhere.
- Today that means one OAuth grant per silo, each one all-or-nothing.
- The agent ends up with unrestricted access to everything, with no way to scope it to a task.
- Your data leaves your control and flows to the agent vendor's cloud.
- There is no record of what an agent read or changed, or why.
- The more capable agents become, the bigger this risk gets.

## 3. ECHO Graph Database (23–33s)

- ECHO brings all of that data into one graph that you own.
- Local-first: the data lives on your devices and works offline; the cloud is a peer, not the owner.
- Typed objects with schema: a message, a task, a person and a sheet are all first-class objects.
- References and relations link objects across apps, so context survives instead of being copied.
- Live queries and indexing by context, so people and agents find what matters.
- Real-time collaboration built in: changes merge automatically (CRDTs, built on Automerge).

## 4. ECHO Hypergraph (33–43s)

- The graph is partitioned into spaces: secure workspaces for a person, a team, a project or a customer.
- Each space has its own members, and access is granted per space, not per vendor.
- Identity and membership come from HALO: keys and credentials you hold, not an account on someone's server.
  _(verify the wording on keys and credentials)_
- Agents get their own identities and join only the spaces they need, with permissions you choose.
- Spaces replicate peer-to-peer, and through EDGE when devices are offline. _(verify the EDGE wording)_
- Objects can still reference across spaces, so the whole remains one hypergraph.

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

## Current narration (for reference)

The lines `flow-cues.json` speaks today, one per slide:

1. "Today, your data is split across vendors. Mail, documents, finance and operations each live in their own app,
   rented back to you."
2. "Agents present new opportunities and challenges. To be useful, they need everything, so we grant them unrestricted
   access to all of it."
3. "DXOS takes a different path. ECHO brings your data into one graph you own, organized and indexed by context."
4. "That graph is partitioned into secure spaces, so each user, team, app and agent sees only the data they need."
5. "And because it's open, it keeps growing. New sources, new apps and new agents plug into the same foundation,
   without ever giving up control. DXOS is the enterprise operating system."
