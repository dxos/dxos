# Saas2D voice-over: brief, variants, critiques

Seven voice-over tracks for the Saas2D animation (`tools/autocue/src/components/Saas2D`), each under two minutes, voiced
by Watson at speed 1.08. This document holds the brief every variant is written to, the fact sheet every claim is
checked against, and for each variant: the problem / opportunity / value-proposition frame, two drafts, two critiques
from a fresh Fable reviewer, and the recorded best version. The tracks themselves are
`tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-<variant>.md`; the first-round review that preceded this document
is [`saas2d-script-review.md`](saas2d-script-review.md).

## Narrative

The full story and its three two-minute cuts live in
[`tools/autocue/showcase/echo3d/NARRATIVE-SAAS2D.md`](../../../tools/autocue/showcase/echo3d/NARRATIVE-SAAS2D.md): a
lecture on the business dynamics in three acts (the SaaS economics and what followed from it; why agents break that
architecture and the deeper lock-in the frontier platforms offer; inversion of control on ECHO, Composer and
Cloudflare). Two of its claims come from the user and sit outside the fact sheet's verified set: that a company can run
EDGE in its own Cloudflare account, and that Composer is the first enterprise superapp.

## Brief

**Audience.** Very senior technical people: CTOs, VPs of engineering, infrastructure executives. Indirect target:
Cloudflare executives (DXOS EDGE runs on Cloudflare Workers).

**Writer.** An expert technical marketing writer. Precise wording. No weasel words ("powerful", "seamless",
"revolutionary", "next-generation", "unlock"). No slogans borrowed from anyone. Every statement true; nothing is argued
in the voice-over, so nothing may need arguing.

**Storyline, in three acts, every variant tells all three:**

1. **Fragmentation.** SaaS revolutionized the software industry: vendors scaled to millions of customers, companies
   stopped running servers. But the model produced lock-in and data held captive, and companies now juggle dozens of
   SaaS products: their data is scattered across silos. Vocabulary: _silos_, _fragmentation_, _lock-in_, _data held
   captive_. Never "copies of data". Never spell out SaaS.
2. **Dependence.** Agents need access to everything to realize their full potential, so the fragmented data flows to the
   frontier model providers. Models improve; the providers absorb the apps they can replace, and their data. As models
   converge, data becomes the moat and the providers consolidate: a winnowing few, with data, compute and intelligence
   concentrated in their hands. The company's vulnerability is dependence on them.
3. **Opportunity.** Companies take back control and rebuild their own stack on ECHO, a semantic graph database and the
   first agent-native database, and on the Composer framework, which integrates agents fully into company workflows,
   with people and agents collaborating in real time. DXOS becomes the company's operating system. The value is control
   and the freedom to innovate, not "less dependence".

**Fixed elements.** Scene ids and take numbering of `SPEAKING-TRACK-SAAS2D.md`. Silence on `blank` and
`final-frontier`. Close: "This is DXOS. Your team. Your apps. Your data." Write DXOS and SaaS as words; `tts.py` spells
them for the voice.

**Pacing.** Watson at 1.08 reads about 2.2 words a second. The scenes' minimum holds sum to about 71 s; the close takes
about 11 s; two minutes leaves about 180 words outside the close. Scenes with slack (motion longer than any sensible
line): `frontier-comms` 6.5 s, `absorb` 5.5 s, `merge-1` 4.5 s, `saas-merge` 5.0 s. Lines carried across a cut are
fine; the voice is continuous.

**Wording the user rejected (first round):** "scale built walled gardens"; "agents need context… to get it"; "SaaS,
software as a service"; "invested in lock-in"; "each holding a copy of company data"; "as models converge, each lab
competes on its platform"; "lets companies build"; "work flows back into the space"; "knowledge base"; "less dependence
on external vendors".

## Fact sheet

Every line below is backed by a file in this repo (checked 2026-11-02). Drafts may only claim what is here.

**ECHO**

- Typed, local-first object graph backed by Automerge; schema, references, query and the `Database` service
  (`packages/core/echo/echo/SPEC.mdl:7`). "A peer-to-peer graph database written in TypeScript"
  (`docs/src/content/docs/docs/echo/introduction.mdx:10`).
- Types are Effect Schema; every type converts to JSON Schema and back; types can be created at runtime and shared like
  objects (`plugin-canvas/src/samples/architecture/echo.md:51,87`).
- References are DXNs, resolved lazily; relations are first-class entities with a source and a target; the hypergraph
  resolves refs across spaces (`echo/SPEC.mdl:104,227`; `echo.md:126`).
- A space is the unit of membership, access and replication (`echo.md:23`). One Automerge document per object; a space
  syncs object by object (`echo.md:149,173`).
- Local-first: the full database lives on the device; reads and writes never wait for a server (`echo.md:21`).
  Replicated peer to peer over MESH and through EDGE on Cloudflare (`echo.md:24`).
- Queries compile to one AST that runs in the client, on the host and on EDGE (`echo.md:285`); graph traversal
  (`reference`, `referencedBy`, `sourceOf`, `targetOf`, `parent`, `children`: `echo/src/Query.ts:91-172`); full-text
  search via SQLite FTS5 (`index-core/SPEC.mdl:7`).
- Feeds: append-only logs for agent conversations, messages and event streams (`echo.md:328,332`).
- Access: HALO key-pair identity, passwordless; every member, device and feed admitted by a signed credential
  (`echo.md:234`; `halo/introduction.md:15-18`). Roles pull / read / edit / admin (`halo/SPEC.mdl:69`).

**Agents**

- "Queries, feeds, triggers and agents all work over the same objects" (`echo.md:25`).
- Operation: a typed function, run locally or remotely; Trigger: runs an operation on a query match, feed append, timer,
  email or webhook; Agent: a conversation process bound to a feed, tools and instructions; both run on the device or on
  EDGE, next to the data (`echo.md:474-477`).
- Agents query, read, create, update and remove objects (`plugin-space/src/skills/DatabaseSkill.ts:21-39`); access is
  governed by skills (`compute/mcp-server/README.md:26`).
- Agents hold their own HALO identity and default space on EDGE (`plugin-agent/PLUGIN.mdl:161,169`; DeviceKind `agent`,
  `halo/SPEC.mdl:41`).
- MCP server over the operation registry; shipping host is `dx mcp serve`, EDGE hosting pending (`mcp-server/README.md:3-8`).

**Composer**

- "An extensible IDE, built for both real time and async collaboration … customizable AI-driven workflows — all in one
  modular, composable workspace" (`README.md:21`). Everything is built on the same App Framework APIs, UI down to data
  (`composer/introduction.mdx:8`). 122 plugins.
- Assistant: conversational AI, skill-driven automation, multi-provider LLMs, deep ECHO integration
  (`plugin-assistant/PLUGIN.mdl:7`). Projects: instructions, skills, tasks, routines, artifacts, chats; tasks assigned to
  agents (`plugin-projects/PLUGIN.mdl:7`). Inbox: email, calendar, contacts, with extractors on EDGE
  (`plugin-inbox/PLUGIN.mdl:7`). Scripts run on EDGE; agents scaffold and test them in chat (`plugin-script/PLUGIN.mdl:9-11`).

**EDGE on Cloudflare**

- "Web services running on Cloudflare workers, providing sync, backup, compute" (`docs index.mdx:20`). A set of Workers
  with Durable Objects: router (device WebSockets), hub (accounts, invitations), db (every space's documents); compute
  runs functions and triggers next to the data (`echo.md:391-394`).
- Durable Objects: feed, indexer, agent brain, mailbox (`feed/SPEC.mdl:8`; `index-core/SPEC.mdl:9`;
  `plugin-agent/docs/BRAIN.md:16`). R2 for blobs (`plugin-file/docs/ASSISTANT-UPLOAD.md:189`). Workers AI for Clef
  (`plugin-typesafe/PLUGIN.mdl:34`). Functions runtime for Workers (`functions-runtime-cloudflare/README.md:3`).
- Composer itself deploys as a Worker with static assets (`composer-app/wrangler.jsonc:2`).

**Do not claim**

- _Semantic graph database / semantic search / vector search._ The RDF semantic graph lives outside ECHO
  (`pipeline-rdf/DESIGN.md:3`); vector search is named in the plan but not implemented
  (`echo-host/src/query/query-executor.ts:1747`; `echo.md:308`). The user asked for "a powerful semantic graph
  database; the first agent-native database"; the tracks say "a graph database of typed objects and relations",
  with "built for agents" where the register wants it, pending the user's ruling.
- _First agent-native database._ No source backs "first".
- _End-to-end encrypted._ Content is not E2EE; it is the goal of the Keyhive migration (`halo/MIGRATION.md:74`).
- _No servers / fully peer-to-peer._ EDGE does sync, signalling, indexing, compute. Say local-first, synchronized through
  EDGE.
- _Self-hostable EDGE._ Separate repository, no self-hosting docs.
- _Open source._ FSL-1.1-Apache-2.0: source-available, Apache 2.0 two years after each release (`LICENSE:32-90`).
- _MCP on EDGE._ Pending.

## Variants

After the second critique, two tracks were trimmed again to fit the picture under two minutes (`cf-stack`:
`objects`, `echo-spaces-again`; `cf-platform`: `engulf`, `object-created`); the Best column shows the voiced text.

Six variants: three angles for the Cloudflare audience, then the Anthropic, Salesforce and x.ai registers. Each
ran twice through a fresh Fable reviewer who saw only the brief, the fact sheet, the frame and the draft.
Renders: `~/Desktop/Demos/Composer/saas2d-<variant>-voiced.mp4` and `-720p.mp4`; holds:
`tools/autocue/showcase/echo3d/voice/holds-saas2d-<variant>.json`.

| Variant          | Track                                                                                                                       | Length | Words | Angle                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cf-stack`       | [`SPEAKING-TRACK-SAAS2D-cf-stack.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-cf-stack.md)             | 1:58.8 | 180   | Cloudflare: the stack: Infrastructure architecture, engineer to engineer.                                                                                    |
| `cf-sovereignty` | [`SPEAKING-TRACK-SAAS2D-cf-sovereignty.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-cf-sovereignty.md) | 1:52.4 | 181   | Cloudflare: sovereignty: Risk and control, for the executive who owns the infrastructure decision.                                                           |
| `cf-platform`    | [`SPEAKING-TRACK-SAAS2D-cf-platform.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-cf-platform.md)       | 1:58.4 | 181   | Cloudflare: the platform: Builder economics: agents as the new workload, companies as the ones who should capture the value.                                 |
| `anthropic`      | [`SPEAKING-TRACK-SAAS2D-anthropic.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-anthropic.md)           | 1:56.6 | 182   | Anthropic register: Measured and plain.                                                                                                                      |
| `salesforce`     | [`SPEAKING-TRACK-SAAS2D-salesforce.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-salesforce.md)         | 1:55.1 | 181   | Salesforce register: Aspirational enterprise copy in the second person: 'every', 'your', contrast pairs, agents as teammates, control as the headline value. |
| `xai`            | [`SPEAKING-TRACK-SAAS2D-xai.md`](../../../tools/autocue/showcase/echo3d/SPEAKING-TRACK-SAAS2D-xai.md)                       | 1:53.1 | 178   | x.ai register: Blunt, short jabs, one dry aside.                                                                                                             |

### `cf-stack`: Cloudflare: the stack

- **Register.** Infrastructure architecture, engineer to engineer. Where data lives, where compute runs, what synchronizes what. Colon lists, concrete nouns, no adjectives without load. Third person throughout.
- **Problems.** Company data is fragmented across dozens of SaaS silos; no system holds all of it. Agents need access to everything, so the data is re-centralized in the frontier labs, which absorb the apps and consolidate.
- **Opportunity.** Rebuild the stack around the company's own data: a local-first graph on every device, synchronized through EDGE on Cloudflare Workers, with agents running next to the data.
- **DXOS value proposition.** ECHO (typed graph of objects and relations, local-first, replicated through EDGE) and Composer (agents in the company's workflows, collaborating in real time) make DXOS the company's operating system; the company controls data, agents and compute.

**Draft 1** (211 words), **revision 1** (204 words) and the **recorded
best** (180 words), outside the fixed close:

| Scene               | Draft 1                                                                                                                          | Revision 1                                                                                                                 | Best                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `beginning`         | SaaS revolutionized the software industry.                                                                                       | SaaS revolutionized the software industry.                                                                                 | SaaS revolutionized the software industry.                                                  |
| `silo`              | Companies stopped running servers.                                                                                               | Companies stopped running servers.                                                                                         | Companies stopped running servers.                                                          |
| `silo-comms`        | Software shipped continuously, and costs fell.                                                                                   | The data moved to the vendor.                                                                                              | The data moved to the vendor.                                                               |
| `scale`             | Vendors scaled to millions of customers.                                                                                         | Vendors scaled to millions of customers.                                                                                   | Vendors scaled to millions of customers.                                                    |
| `competitors`       | But every platform locked its customers in, and held their data captive.                                                         | But every platform locked its customers in, their data held captive.                                                       | But the model locked customers in, data held captive.                                       |
| `spread`            | Today a company juggles dozens of SaaS products.                                                                                 | Today a company juggles dozens of SaaS products.                                                                           | Today a company juggles dozens of SaaS products,                                            |
| `spread-comms`      | Dozens of silos: its data fragmented across all of them, accessible as a whole to no one.                                        | Dozens of silos: its data fragmented, whole in none.                                                                       | dozens of silos: data fragmented, whole in none.                                            |
| `frontier`          | Then came AI.                                                                                                                    | Then came agents.                                                                                                          | Then came agents.                                                                           |
| `frontier-comms`    | Agents need access to everything to realize their potential. The silos can't provide it, so the data flows to the frontier labs. | Agents need access to everything to realize their potential, and no silo holds it. So the data flows to the frontier labs. | Agents need access to everything; no silo holds it. The data flows to the frontier labs.    |
| `orbit`             | Models improve every quarter,                                                                                                    | Models improve,                                                                                                            | Models improve,                                                                             |
| `absorb`            | and the labs absorb the apps they can replace, with the data inside them.                                                        | and the labs absorb the apps they can replace, with the data inside.                                                       | and the labs absorb the apps they can replace, data included.                               |
| `rivals`            | As models converge, data becomes the moat, and every lab is after yours.                                                         | As models converge, data becomes the moat.                                                                                 | Models converge; data becomes the moat.                                                     |
| `merge-1`           | The labs consolidate.                                                                                                            | The labs consolidate.                                                                                                      | The labs consolidate.                                                                       |
| `engulf`            | Data, compute and intelligence, concentrated in a winnowing few.                                                                 | Data, compute and intelligence, concentrated in a winnowing few. Every company depends on them.                            | Data, compute, intelligence: a winnowing few. The company depends on them.                  |
| `dont-panic`        | There is an alternative.                                                                                                         | There is an alternative.                                                                                                   | Companies take back control,                                                                |
| `spread-again`      | Rebuild the stack around your own data.                                                                                          | Rebuild the stack around the company's own data.                                                                           | rebuilding the stack around their own data.                                                 |
| `echo-hub`          | DXOS gives companies full control over their data and their agents.                                                              | DXOS: the company controls its data and its agents.                                                                        | DXOS: the company's data, the company's agents.                                             |
| `echo-spaces`       | ECHO: a semantic graph of typed objects and relations, and an agent-native database.                                             | ECHO: a graph database of typed objects and relations, built for agents.                                                   | ECHO: a graph database of typed objects and relations.                                      |
| `objects`           | Documents, records and messages, linked in one graph.                                                                            | Documents, records and messages, one graph; agents work the same objects.                                                  | Documents, records and messages: one graph for people and agents.                           |
| `object-created`    | Composer integrates agents into the company's workflows. People and agents collaborate in real time.                             | Composer: agents in the company's workflows, collaborating with people in real time.                                       | Composer: agents in the company's workflows, collaborating with people in real time.        |
| `echo-spaces-again` | Local-first on every device, synchronized and computed at the edge.                                                              | Every device holds the database. EDGE on Cloudflare Workers synchronizes it and runs agents beside the data.               | Every device holds the database. EDGE, on Cloudflare Workers, syncs it and runs the agents. |
| `echo-hub-again`    | DXOS becomes the company's operating system.                                                                                     | DXOS becomes the company's operating system.                                                                               | DXOS becomes the company's operating system.                                                |
| `saas-merge`        | Control returns to the company, and with it the freedom to build.                                                                | Control returns to the company, and with it the freedom to innovate.                                                       | Control returns to the company, and with it the freedom to innovate.                        |

**Critique 1** (fresh Fable reviewer, on draft 1):

**Storyline.** Act 3 weakest: the frame promises where data lives and compute runs, the draft never says (no Workers, no device-versus-edge split beyond "at the edge"). Act 1 over-told.
**Truth.** ECHO line forbidden. "full control" implies hosting control. `silo-comms` "costs fell" unbacked. "every quarter" invented. "every lab is after yours" argues.
**Precision.** "realize their potential" cliché. "silos can't provide it": silos do not provide; no silo holds all of it. "synchronized and computed at the edge": data is not computed. Point of view flips between "a company" and "your". "Then came AI" hollow. "accessible as a whole to no one" clunky.
**Pacing.** 211 words. `silo-comms` talks cadence over a data-flow picture; `orbit` needs only a two-word hinge; `echo-spaces-again` (sync chips) is the one place to name Workers.
**Register.** Mostly held. Not naming Cloudflare is a failure for this variant: the fact sheet backs "EDGE on Cloudflare Workers" and the indirect audience is Cloudflare. Name it once, as infrastructure. Never name a lab.
**Rewrite (180 words).** Adopted with edits; see revision 1.

**Critique 2** (fresh Fable reviewer, on revision 1):

**Storyline.** All acts present; `frontier-comms` "So the data flows" argues a causal step. Act 3 sags at `dont-panic` → `spread-again` (caption read-back, then an imperative) and `echo-hub` pre-empts `saas-merge` on control: make `echo-hub` name the stack, leave control for the end.
**Truth.** "built for agents" edges toward the banned "agent-native": cut. "every platform locked" and "Every company depends" are universals the brief does not make: the model, the company.
**Precision.** "to realize their potential" filler. Imperative `spread-again` in a third-person script. "agents work the same objects": wrong verb. Semicolon cadence for the Workers line. "data included".
**Pacing.** 204 → 180; longest line 16 words.
**Final.** Adopted as the recorded best. "control" bookends Act 3 deliberately.

### `cf-sovereignty`: Cloudflare: sovereignty

- **Register.** Risk and control, for the executive who owns the infrastructure decision. Calm, declarative, third person; the stakes stated once and plainly. Who holds what.
- **Problems.** Lock-in and captive data were tolerable while SaaS was many vendors. Agents change the calculus: they need access to all of a company's data, and today that means a frontier lab. As models converge the labs consolidate, and dependence on a winnowing few becomes the company's largest single risk.
- **Opportunity.** Hold the data and govern the agents: a company-controlled graph, with agents admitted like members, acting within the access the company grants.
- **DXOS value proposition.** ECHO's spaces govern membership and replication; agents hold their own identities and act inside the company's permissions; Composer integrates them into workflows; DXOS becomes the operating system the company controls.

**Draft 1** (223 words), **revision 1** (197 words) and the **recorded
best** (181 words), outside the fixed close:

| Scene               | Draft 1                                                                                                                                             | Revision 1                                                                                                                        | Best                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `beginning`         | SaaS revolutionized the software industry.                                                                                                          | SaaS revolutionized the software industry.                                                                                        | SaaS revolutionized the software industry.                                                  |
| `silo`              | Companies handed their servers to vendors.                                                                                                          | Companies stopped running servers.                                                                                                | Companies stopped running servers.                                                          |
| `silo-comms`        | Software improved continuously; costs fell.                                                                                                         | Vendors ran them, and held the data.                                                                                              | Vendors ran them, and held the data.                                                        |
| `scale`             | Vendors scaled to millions of customers.                                                                                                            | Vendors scaled to millions of customers.                                                                                          | Vendors scaled to millions of customers.                                                    |
| `competitors`       | But each platform locked its customers in, and held their data captive.                                                                             | But each platform locked its customers in, and held their data captive.                                                           | Each locked its customers in, and held their data captive.                                  |
| `spread`            | A company now juggles dozens of SaaS products.                                                                                                      | A company now juggles dozens of SaaS products.                                                                                    | A company now juggles dozens of SaaS products.                                              |
| `spread-comms`      | Dozens of silos. Its data, fragmented across all of them.                                                                                           | Dozens of silos; its data fragmented across them.                                                                                 | Its data, fragmented across dozens of silos.                                                |
| `frontier`          | Then came AI.                                                                                                                                       | Then came agents.                                                                                                                 | Then came agents.                                                                           |
| `frontier-comms`    | Agents need access to everything to realize their full potential, and the only place that has everything is a frontier lab. So the data goes there. | Agents need access to everything to realize their full potential. Today, that means a frontier lab. So the data goes to the labs. | Agents need access to everything. Today that means a frontier lab, and the data goes there. |
| `orbit`             | Each generation of models is more capable,                                                                                                          | Models grow more capable,                                                                                                         | Models grow more capable,                                                                   |
| `absorb`            | and the labs absorb the apps they can replace, along with the data.                                                                                 | and the labs absorb the apps they can replace, with their data.                                                                   | and the labs absorb the apps they can replace, with their data.                             |
| `rivals`            | As models converge, data becomes the moat. Each lab competes to hold yours.                                                                         | As models converge, data becomes the moat.                                                                                        | As models converge, data becomes the moat.                                                  |
| `merge-1`           | The field narrows.                                                                                                                                  | The labs consolidate.                                                                                                             | The labs consolidate.                                                                       |
| `engulf`            | Data, compute and intelligence, held by a winnowing few. Your company depends on them.                                                              | Data, compute and intelligence, held by a winnowing few. The company now depends on them.                                         | Data, compute and intelligence, held by a winnowing few. The company depends on them.       |
| `dont-panic`        | It doesn't have to be this way.                                                                                                                     | There is an alternative.                                                                                                          | The company can choose otherwise.                                                           |
| `spread-again`      | Keep the data. Run the agents yourself.                                                                                                             | The company keeps its data.                                                                                                       | It keeps its data.                                                                          |
| `echo-hub`          | DXOS gives companies full control over their data and their agents.                                                                                 | DXOS puts data and agents under the company's control.                                                                            | DXOS puts data and agents under the company's control.                                      |
| `echo-spaces`       | ECHO: a semantic graph of typed objects and relations, and an agent-native database.                                                                | ECHO: a graph database of typed objects and relations, built for agents.                                                          | ECHO: a local-first graph database of typed objects and relations.                          |
| `objects`           | Documents, records and messages, linked in one graph.                                                                                               | Documents, records and messages, one graph.                                                                                       | Documents, records and messages, one graph.                                                 |
| `object-created`    | Composer integrates agents into the company's workflows, where people and agents collaborate in real time.                                          | Composer integrates agents into the company's workflows; people and agents collaborate in real time.                              | Composer integrates agents into the company's workflows, working with people in real time.  |
| `echo-spaces-again` | Agents are admitted like any member, with the access the company grants and nothing more.                                                           | Agents join like any member, with the access the company grants and nothing more.                                                 | Agents join like any member, with only the access the company grants.                       |
| `echo-hub-again`    | DXOS becomes the company's operating system.                                                                                                        | DXOS becomes the company's operating system.                                                                                      | DXOS becomes the company's operating system.                                                |
| `saas-merge`        | The company takes back control, and the freedom to innovate.                                                                                        | The company takes back control, and the freedom to innovate.                                                                      | The company takes back control, and the freedom to innovate.                                |

**Critique 1** (fresh Fable reviewer, on draft 1):

**Storyline.** Act 2 strongest, tracks the screen beat for beat. Act 3 weakest: two near-duplicate control lines (`spread-again`, `echo-hub`), product line spent on forbidden claims, never says what ECHO is in allowed terms.
**Truth.** ECHO line forbidden. `frontier-comms` "the only place that has everything is a frontier lab" argues. `spread-again` "Run the agents yourself" reads as self-hosting. `silo-comms` "costs fell" unbacked. "full control" unbacked.
**Precision.** "So the data goes there": vague verb doing the act's key work. `dont-panic` reads the caption back. "competes to hold yours" close to the rejected line and shifts person. "The field narrows" sports metaphor, the brief's word is consolidate. "capable" weak.
**Pacing.** 223 words. `frontier-comms` at 26 words overruns its 6.5 s hold. Collapse the two control lines. `rivals` motion verb over a static split; `spread-again` says agents while the screen shows apps.
**Register.** Held; slips: second-person "yours" in `rivals`, colloquial `dont-panic`.
**Rewrite (180 words).** Adopted in part; see revision 1.

**Critique 2** (fresh Fable reviewer, on revision 1):

**Storyline.** Dependence stated in three declaratives with no "because". Act 1 spends three lines on setup; `echo-spaces` → `objects` describe ECHO with no stake attached, acceptable since the picture carries them.
**Truth.** "built for agents" is design intent the sheet does not back; `echo-hub` and `echo-spaces-again` already carry agents. Cut.
**Precision.** "realize their full potential" filler. "So the data goes to the labs" narrates the animation and repeats the previous sentence. "each platform" after vendors. `dont-panic` reads the caption verbatim: "The company can choose otherwise." "now" hedges `engulf`. "and nothing more" → "only".
**Pacing.** 197 → 180; `frontier-comms` 23 → 16 words (~7.3 s inside its hold).
**Final.** Adopted as the recorded best, with "local-first" restored to the ECHO line.

### `cf-platform`: Cloudflare: the platform

- **Register.** Builder economics: agents as the new workload, companies as the ones who should capture the value. Short sentences, platform vocabulary, no sentence over 18 words.
- **Problems.** SaaS fragmented company data into silos and locked it in. Agents are the new workload and need access to all of that data; today the only platforms positioned to give it to them are the frontier labs, which absorb apps and consolidate.
- **Opportunity.** A platform the company owns: its data in one graph, its agents running on it, its own apps replacing the ones it rents.
- **DXOS value proposition.** ECHO as the data layer, Composer as the framework for apps and agent workflows, EDGE running functions, triggers and agents next to the data on Cloudflare. Companies build instead of rent; DXOS becomes their operating system.

**Draft 1** (203 words), **revision 1** (191 words) and the **recorded
best** (181 words), outside the fixed close:

| Scene               | Draft 1                                                                                                                             | Revision 1                                                                                             | Best                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `beginning`         | SaaS revolutionized the software industry.                                                                                          | SaaS revolutionized the software industry.                                                             | SaaS revolutionized the software industry.                                                          |
| `silo`              | Rent the software; forget the servers.                                                                                              | Companies rented software and stopped running servers.                                                 | Companies rented software and stopped running servers.                                              |
| `silo-comms`        | Continuous updates. Lower costs.                                                                                                    | The data went with it.                                                                                 | The data moved too.                                                                                 |
| `scale`             | Vendors scaled to millions of customers.                                                                                            | Vendors scaled to millions of customers.                                                               | Vendors scaled to millions of customers.                                                            |
| `competitors`       | But every platform locked its customers in, and held their data captive.                                                            | But every vendor locked its customers in, and held their data captive.                                 | But the model locked customers in, data held captive.                                               |
| `spread`            | Today a company juggles dozens of SaaS products.                                                                                    | Today a company juggles dozens of SaaS products.                                                       | Today a company juggles dozens of SaaS products.                                                    |
| `spread-comms`      | Dozens of silos; its data fragmented across every one.                                                                              | Dozens of silos; its data fragmented across every one.                                                 | Dozens of silos, fragmenting its data.                                                              |
| `frontier`          | Then came AI.                                                                                                                       | Then came agents.                                                                                      | Then agents: the new workload.                                                                      |
| `frontier-comms`    | Agents are the new workload, and they need access to everything to realize their potential. So the data flows to the frontier labs. | Agents are the new workload. They need access to everything, so the data flows to the frontier labs.   | They need access to everything, so the data flows to the frontier labs.                             |
| `orbit`             | Models improve every quarter,                                                                                                       | Models improve,                                                                                        | Models improve,                                                                                     |
| `absorb`            | and the labs absorb the apps they can replace, data included.                                                                       | and the labs absorb the apps they can replace, data included.                                          | and the labs absorb the apps they can replace, data included.                                       |
| `rivals`            | As models converge, data becomes the moat, and the labs race to own yours.                                                          | As models converge, data becomes the moat.                                                             | As models converge, data becomes the moat.                                                          |
| `merge-1`           | Then they consolidate.                                                                                                              | The labs consolidate.                                                                                  | The labs consolidate.                                                                               |
| `engulf`            | Data, compute and intelligence, in a winnowing few hands.                                                                           | Data, compute and intelligence, concentrated in a winnowing few. Every company depends on them.        | Data, compute and intelligence, in a winnowing few. Every company depends on them.                  |
| `dont-panic`        | There is an alternative.                                                                                                            | There is an alternative.                                                                               | Unless it builds its own.                                                                           |
| `spread-again`      | Build on your own data, not theirs.                                                                                                 | Build on the company's own data.                                                                       | Starting from its own data.                                                                         |
| `echo-hub`          | DXOS gives companies full control over their data and their agents.                                                                 | DXOS: the company owns its data layer and its agents.                                                  | DXOS: the company owns its data layer and its agents.                                               |
| `echo-spaces`       | ECHO: a semantic graph of typed objects and relations, and an agent-native database.                                                | ECHO: a local-first graph of typed objects and relations, built for agents.                            | ECHO: a local-first graph of typed objects and relations, built for agents.                         |
| `objects`           | Documents, records and messages, linked in one graph.                                                                               | Documents, records, messages: one graph.                                                               | Documents, records, messages: one graph.                                                            |
| `object-created`    | Composer is the framework: agents integrated into the company's workflows, collaborating with people in real time.                  | Composer: the framework for apps and agent workflows, people and agents working together in real time. | Composer is the framework for apps and agent workflows. People and agents collaborate in real time. |
| `echo-spaces-again` | Functions, triggers and agents run next to the data, at the edge.                                                                   | Functions, triggers and agents run next to the data, on EDGE.                                          | Functions, triggers and agents run next to the data: EDGE, on Cloudflare.                           |
| `echo-hub-again`    | DXOS becomes the company's operating system.                                                                                        | DXOS becomes the company's operating system.                                                           | DXOS becomes the company's operating system.                                                        |
| `saas-merge`        | Companies build instead of rent, and take back control.                                                                             | Companies build instead of rent: control, and the freedom to innovate.                                 | Companies build instead of rent: control, and the freedom to innovate.                              |

**Critique 1** (fresh Fable reviewer, on draft 1):

**Storyline.** Acts 1 and 2 land. Act 3 weakest: asserts instead of shows; "Composer is the framework" names no object; the ECHO line spends 13 words on forbidden claims; the value (control and the freedom to innovate) is only half stated.
**Truth.** ECHO line both halves unbacked. "full control" overclaims. "every quarter" invented cadence. "Rent the software; forget the servers" odd imperative narration of history.
**Precision.** "realize their potential" HR phrase. "race" cliché over a static picture. "winnowing few hands": hands do not winnow. "Then came AI" flat, the act is about agents. "not theirs" no antecedent. "Then they consolidate" ambiguous "they".
**Pacing.** 203 words. `frontier-comms` at 23 words runs ~10.5 s over a 6.5 s flow, the payoff lands after the motion stops: cut to ~18. Trim `rivals`, `echo-spaces`, `objects`.
**Register.** Holds except the 23-word sentence. "Take back control" reads as a borrowed political slogan.
**Rewrite (180 words).** Adopted with edits; see revision 1.

**Critique 2** (fresh Fable reviewer, on revision 1):

**Storyline.** All acts land; dependence stated. Act 1 sags at `silo-comms` ("it" unresolved) and `spread-comms` (repeats "dozens"). Act 3 clean.
**Truth.** "every vendor locked" is a universal no fact backs: the model. "built for agents" indirectly backed, the softest line left. Naming Cloudflare in `echo-spaces-again` is backed and is the point of this variant; the draft omitted it.
**Precision.** `dont-panic` reads the caption back: "Unless it builds its own." `spread-again` imperative addressed to nobody. Dangling participle in `object-created`. Thesis moved onto `frontier` ("Then agents: the new workload."), mechanism kept on the slack scene.
**Pacing.** 191 → 180; no line over 15 words.
**Final.** Adopted as the recorded best.

### `anthropic`: Anthropic register

- **Register.** Measured and plain. Medium-length declaratives, third person, the risk named calmly and once, no superlatives, claims scoped to what is true.
- **Problems.** SaaS fragmented company data into silos and held it captive. Agents need access to all of it to be useful, so companies route their data to a few frontier labs; as models converge those labs consolidate, and dependence on them becomes a structural risk for every company.
- **Opportunity.** Companies keep their data and run agents within their own permissions, collaborating with people in real time.
- **DXOS value proposition.** ECHO's typed graph and spaces give agents the whole context under the company's control; Composer integrates agents into workflows with scoped access; DXOS becomes the company's operating system.

**Draft 1** (213 words), **revision 1** (183 words) and the **recorded
best** (182 words), outside the fixed close:

| Scene               | Draft 1                                                                                                                             | Revision 1                                                                                                | Best                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `beginning`         | SaaS revolutionized the software industry.                                                                                          | SaaS revolutionized the software industry.                                                                | SaaS revolutionized the software industry.                                                       |
| `silo`              | Companies stopped running their own servers.                                                                                        | Companies stopped running servers.                                                                        | Companies stopped running servers.                                                               |
| `silo-comms`        | Software improved continuously, and costs fell.                                                                                     | The data moved to the vendor.                                                                             | The data moved to the vendor.                                                                    |
| `scale`             | Vendors grew to serve millions of customers.                                                                                        | Vendors scaled to millions of customers.                                                                  | Vendors scaled to millions of customers.                                                         |
| `competitors`       | But each platform locked its customers in, and held their data captive.                                                             | But each platform locked customers in and held their data captive.                                        | But each vendor locked customers in and held their data captive.                                 |
| `spread`            | Today, companies juggle dozens of SaaS products.                                                                                    | Companies juggle dozens of SaaS products.                                                                 | Companies juggle dozens of SaaS products.                                                        |
| `spread-comms`      | Their data sits in dozens of silos, fragmented.                                                                                     | Their data is fragmented across silos.                                                                    | Their data is fragmented across silos.                                                           |
| `frontier`          | Then came generative AI.                                                                                                            | Then came agents.                                                                                         | Then came agents.                                                                                |
| `frontier-comms`    | Agents need access to everything to realize their full potential. The silos cannot give it, so the data moves to the frontier labs. | Agents need access to everything to realize their full potential, so the data flows to the frontier labs. | Agents need access to everything to be useful, so the data flows to the frontier labs.           |
| `orbit`             | Models are improving quickly,                                                                                                       | Models improve,                                                                                           | Models improve,                                                                                  |
| `absorb`            | and the labs absorb the applications they can replace, together with the data.                                                      | and the labs absorb the applications they can replace, with their data.                                   | and the labs absorb the applications they can replace, and their data.                           |
| `rivals`            | As models converge, data becomes the moat. Each lab competes to hold yours.                                                         | As models converge, data becomes the moat.                                                                | As models converge, data becomes the moat.                                                       |
| `merge-1`           | The labs consolidate.                                                                                                               | The labs consolidate.                                                                                     | The labs consolidate.                                                                            |
| `engulf`            | Data, compute and intelligence, concentrated in a winnowing few. We think that is the risk.                                         | Data, compute and intelligence, concentrated in a winnowing few. Every company depends on them.           | Data, compute and intelligence, concentrated in a winnowing few. Every company depends on them.  |
| `dont-panic`        | There is a better path.                                                                                                             | There is another path.                                                                                    | There is another path.                                                                           |
| `spread-again`      | One where the company keeps its data.                                                                                               | One where the company keeps its data.                                                                     | One where the company keeps its data.                                                            |
| `echo-hub`          | DXOS gives companies full control over their data and their agents.                                                                 | DXOS puts data and agents back under the company's control.                                               | DXOS puts the company's data and agents under its control.                                       |
| `echo-spaces`       | ECHO: a semantic graph of typed objects and relations, and an agent-native database.                                                | ECHO: a graph database of typed objects and relations, built for agents.                                  | ECHO: a local-first graph database of typed objects and relations, built for agents.             |
| `objects`           | Documents, records and messages, as linked objects agents can read and write.                                                       | Documents, records, messages: linked objects agents read and write.                                       | Documents, records, messages: linked objects agents read and write.                              |
| `object-created`    | Composer integrates agents into the company's workflows. People and agents collaborate in real time.                                | Composer brings agents into the company's workflows; people and agents collaborate in real time.          | Composer brings agents into the company's workflows; people and agents collaborate in real time. |
| `echo-spaces-again` | Each agent acts within the access the company grants it.                                                                            | Each agent acts within the access it is granted.                                                          | Each agent acts within the access it is granted.                                                 |
| `echo-hub-again`    | DXOS becomes the company's operating system.                                                                                        | DXOS becomes the company's operating system.                                                              | DXOS becomes the company's operating system.                                                     |
| `saas-merge`        | Companies take back control, and the freedom to innovate.                                                                           | Companies take back control, and the freedom to innovate.                                                 | Companies take back control, and the freedom to innovate.                                        |

**Critique 1** (fresh Fable reviewer, on draft 1):

**Storyline.** All three acts present; weakest is Dependence: the word never appears, `engulf` substitutes an opinion ("We think that is the risk"), `orbit` is a dangling clause.
**Truth.** `echo-spaces` "semantic graph" is on the do-not-claim list; "agent-native" is a positioning claim with no source. `echo-hub` "full control" overreaches (EDGE sync, no E2EE): say "control". `silo-comms` "costs fell" is unbacked history. `engulf` "We think" argues, and introduces a "we" the script never uses.
**Precision.** "continuously" filler; "fragmented" tacked on as a participle; "improving quickly" vague; "hold yours" coy; "a better path" evaluative, "another" matches THE ALTERNATIVE; drop "full" from "full potential"; "Today," filler.
**Pacing.** 213 words. Cut `frontier-comms` (the "silos cannot give it" clause restates `spread-comms`), `rivals`, `silo-comms`, `scale`, `spread-comms`. `silo-comms` talks cost over a data-flow picture; `engulf` disclaimer fights the wry caption; `orbit` fragment over a full reconfiguration, let `absorb` carry the sentence.
**Register.** Holds, except the two slips above.
**Rewrite (180 words).** Adopted with edits; see revision 1.

**Critique 2** (fresh Fable reviewer, on revision 1):

**Storyline.** All three acts land; dependence stated flat. Act 3 says control three times in eight lines: drop "back" from `echo-hub`.
**Truth.** "built for agents" is a design-purpose claim with no source (replace with "local-first"); "back under control" false for agents, which were never elsewhere.
**Precision.** "realize their full potential" brochure; "to be useful". "each platform" after "vendor": keep vendor. "with their data" ambiguous. "a winnowing few": winnowing is what the sifter does, suggests "dwindling". No caption read-backs; third person holds.
**Pacing.** 183 → 179 with the fixes.
**Final.** Adopted, with two exceptions: "winnowing few" stays (the user's word), and the ECHO line keeps "built for agents" alongside "local-first" (the brief asks for ECHO's agent framing; fact sheet: queries, feeds, triggers and agents over the same objects).

### `salesforce`: Salesforce register

- **Register.** Aspirational enterprise copy in the second person: 'every', 'your', contrast pairs, agents as teammates, control as the headline value. Hype that is not true is a defect.
- **Problems.** Your company juggles dozens of SaaS products; your data is fragmented across silos and held captive. Agents need access to everything, and today that means a frontier lab; as models converge, the labs consolidate and your business depends on them.
- **Opportunity.** Your company at the centre: your data in one graph, your agents working beside your people, under your rules.
- **DXOS value proposition.** ECHO holds every document, record and message as linked objects; Composer puts agents to work in your workflows, in real time, under your access rules; DXOS becomes your company's operating system.

**Draft 1** (200 words), **revision 1** (185 words) and the **recorded
best** (181 words), outside the fixed close:

| Scene               | Draft 1                                                                                                                             | Revision 1                                                                                                 | Best                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `beginning`         | SaaS revolutionized the software industry.                                                                                          | SaaS revolutionized the software industry.                                                                 | SaaS revolutionized the software industry.                                        |
| `silo`              | No servers to run.                                                                                                                  | No servers to run.                                                                                         | No servers to run.                                                                |
| `silo-comms`        | Continuous innovation, at lower cost.                                                                                               | Your data lived with the vendor.                                                                           | Your data lived with the vendor.                                                  |
| `scale`             | Vendors grew to serve millions of customers.                                                                                        | Vendors grew to serve millions of customers.                                                               | Vendors grew to serve millions of customers.                                      |
| `competitors`       | But every platform locked you in, and held your data captive.                                                                       | But every platform locked you in, and held your data captive.                                              | But every platform locked you in, and held your data captive.                     |
| `spread`            | Today, your company juggles dozens of SaaS products.                                                                                | Today, your company juggles dozens of SaaS products.                                                       | Your company juggles dozens of SaaS products.                                     |
| `spread-comms`      | Dozens of silos. Your data, fragmented across every one.                                                                            | Dozens of silos, your data fragmented across them.                                                         | Dozens of silos, your data fragmented across them.                                |
| `frontier`          | Then AI changed everything.                                                                                                         | Then came agents.                                                                                          | Then came agents.                                                                 |
| `frontier-comms`    | Agents need access to everything to realize their full potential. The silos can't give it, so your data flows to the frontier labs. | Agents need access to everything to realize their full potential, so your data flows to the frontier labs. | Agents need access to everything, so your data flows to the frontier labs.        |
| `orbit`             | Every model more capable than the last,                                                                                             | Each model more capable than the last,                                                                     | Each model more capable than the last;                                            |
| `absorb`            | and every app they can replace, absorbed, data and all.                                                                             | and every app they can replace, absorbed, data and all.                                                    | every app the labs can replace, absorbed, data and all.                           |
| `rivals`            | As models converge, data becomes the moat. Whoever holds yours holds your business.                                                 | As models converge, data becomes the moat.                                                                 | As models converge, data becomes the moat.                                        |
| `merge-1`           | And the labs consolidate.                                                                                                           | And the labs consolidate.                                                                                  | And the labs consolidate.                                                         |
| `engulf`            | Data, compute and intelligence, in a winnowing few hands.                                                                           | Data, compute and intelligence, in a winnowing few. Your business depends on them.                         | Data, compute, intelligence, in a winnowing few. Your business depends on them.   |
| `dont-panic`        | It doesn't have to be this way.                                                                                                     | It doesn't have to be this way.                                                                            | It doesn't have to be this way.                                                   |
| `spread-again`      | Put your company at the centre.                                                                                                     | Put your company at the centre.                                                                            | Your company at the centre: not a vendor, not a lab.                              |
| `echo-hub`          | DXOS gives you full control over your data and your agents.                                                                         | DXOS puts your data and your agents in your hands.                                                         | DXOS: your data and your agents, in your hands.                                   |
| `echo-spaces`       | ECHO: a semantic graph of typed objects and relations, and an agent-native database.                                                | ECHO: a graph database of typed objects and relations, built for agents.                                   | ECHO: a graph database of typed objects and relations, built for agents.          |
| `objects`           | Every document, every record, every message, connected.                                                                             | Every document, record and message, connected.                                                             | Every document, record and message, connected.                                    |
| `object-created`    | Composer puts agents to work in every workflow, collaborating with your people in real time.                                        | Composer puts agents to work beside your people, in your workflows, in real time.                          | Composer puts agents to work beside your people, in your workflows, in real time. |
| `echo-spaces-again` | Agents work beside your teams, inside your walls.                                                                                   | Every agent under your rules.                                                                              | Every agent under your rules.                                                     |
| `echo-hub-again`    | DXOS becomes your company's operating system.                                                                                       | DXOS becomes your company's operating system.                                                              | DXOS becomes your company's operating system.                                     |
| `saas-merge`        | Take back control, and build what comes next.                                                                                       | Take back control, and the freedom to innovate.                                                            | Take back control. The freedom to innovate.                                       |

**Critique 1** (fresh Fable reviewer, on draft 1):

**Storyline.** Act 1 strongest. Act 2 states dependence only as an argument ("Whoever holds yours holds your business"). Act 3 weakest: forbidden claims, "full control", "inside your walls" (implies on-prem), never says what ECHO is, ends on a cliché not "freedom to innovate".
**Truth.** ECHO line forbidden. "full control". "inside your walls". `rivals` chiasmus argues. `silo-comms` "Continuous innovation, at lower cost" generic vendor copy.
**Precision.** "Then AI changed everything" cliché. "build what comes next" vague. "in every workflow" untestable absolute. "agent-native" undefined coinage.
**Pacing.** 200 words. Cut `silo-comms`, `rivals` second sentence, the "silos can't give it" clause. `spread-comms` "dozens" over 7 apps; `competitors` second person over competitor labels half-implies they are the lock.
**Register.** Held; "inside your walls" and "AI changed everything" read as boilerplate.
**Rewrite (180 words).** Adopted with edits; see revision 1.

**Critique 2** (fresh Fable reviewer, on revision 1):

**Storyline.** All three acts land; dependence stated flat ("Your business depends on them"). Act 3 hinge has three near-content-free lines in a row and "puts" three times in five lines.
**Truth.** Nothing forbidden. "built for agents" defensible (same objects for queries, feeds, triggers, agents). "Every document, record and message, connected" is true of the model, not a migration: the one line that over-reaches, kept for the register.
**Precision.** `orbit`/`absorb` "they" has no antecedent: "every app the labs can replace". "realize their full potential" cut. `spread-again` reads the frame back: "Your company at the centre — not a vendor, not a lab" names the contrast with `scale` and `orbit`. `echo-hub` recast without "puts". "Today," dead weight.
**Pacing.** 185 → 180.
**Final.** Adopted as the recorded best.

### `xai`: x.ai register

- **Register.** Blunt, short jabs, one dry aside. Big stakes stated without hedging; bluntness is not an excuse for imprecision.
- **Problems.** SaaS put company data in dozens of silos and locked it there. Agents need all of it; the labs are the ones taking all of it; as models converge the labs merge and hold the data, the compute and the intelligence.
- **Opportunity.** Keep the data. Rebuild the stack. Put the agents in the loop of real work.
- **DXOS value proposition.** ECHO: one typed graph for everything, built for agents. Composer: agents in the loop with people, in real time. DXOS: the company's operating system.

**Draft 1** (195 words), **revision 1** (181 words) and the **recorded
best** (178 words), outside the fixed close:

| Scene               | Draft 1                                                                                                                      | Revision 1                                                                               | Best                                                                                         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `beginning`         | SaaS revolutionized the software industry.                                                                                   | SaaS revolutionized the software industry.                                               | SaaS revolutionized the software industry.                                                   |
| `silo`              | Rent the software. Shut the server room.                                                                                     | Rent the software. Shut the server room.                                                 | Rent the software. Shut the server room.                                                     |
| `silo-comms`        | Updates daily. Costs down.                                                                                                   | The data moves out too.                                                                  | The data moves out too.                                                                      |
| `scale`             | Vendors scaled to millions of customers.                                                                                     | Vendors scaled to millions of customers.                                                 | Vendors scaled to millions of customers.                                                     |
| `competitors`       | But every platform locked its customers in and held their data captive.                                                      | The price: lock-in, and data held captive.                                               | The price: lock-in and data held captive.                                                    |
| `spread`            | Now a company juggles dozens of SaaS products.                                                                               | Now a company juggles dozens of SaaS products.                                           | Now a company juggles dozens of SaaS products.                                               |
| `spread-comms`      | Dozens of silos. Data everywhere, accessible nowhere.                                                                        | Dozens of silos. Its data fragmented, one app at a time.                                 | Dozens of silos. The data fragmented, one app at a time.                                     |
| `frontier`          | Then AI.                                                                                                                     | Then agents.                                                                             | Enter agents.                                                                                |
| `frontier-comms`    | Agents need access to everything to realize their potential. The silos can't deliver, so the data goes to the frontier labs. | Agents need access to everything. No silo has it, so the data goes to the frontier labs. | Agents need everything. No silo has it, so the data goes to the frontier labs.               |
| `orbit`             | Models get smarter, fast,                                                                                                    | Models improve,                                                                          | Models improve,                                                                              |
| `absorb`            | and the labs eat the apps they can replace, data included.                                                                   | and the labs absorb the apps they can replace, data included.                            | and the labs absorb the apps they can replace, data included.                                |
| `rivals`            | First principles: as models converge, data is the only moat. Every lab wants yours.                                          | As models converge, data is the moat. Every lab wants yours.                             | As models converge, data is the moat. Every lab wants yours.                                 |
| `merge-1`           | Then they merge.                                                                                                             | Then they merge.                                                                         | Then they merge.                                                                             |
| `engulf`            | Data, compute and intelligence, in a winnowing few hands. Not ideal.                                                         | Data, compute and intelligence, in a winnowing few. Not ideal. You depend on them.       | Data, compute and intelligence, in a winnowing few. Not ideal. Your company depends on them. |
| `dont-panic`        | It doesn't have to be this way.                                                                                              | There is an alternative.                                                                 | You don't have to.                                                                           |
| `spread-again`      | Keep the data where it belongs.                                                                                              | Keep the data where it belongs.                                                          | Keep the data where it belongs.                                                              |
| `echo-hub`          | DXOS gives companies full control over their data and their agents.                                                          | DXOS: the company controls its data and its agents.                                      | DXOS: the company controls its data and its agents.                                          |
| `echo-spaces`       | ECHO: a semantic graph of typed objects and relations, and an agent-native database.                                         | ECHO: one typed graph of objects and relations, built for agents.                        | ECHO: one typed graph of objects and relations, built for agents.                            |
| `objects`           | Documents, records and messages, one linked graph.                                                                           | Documents, records and messages, one linked graph.                                       | Documents, records and messages, all linked.                                                 |
| `object-created`    | Composer puts agents in the loop: integrated into the company's workflows, collaborating with people in real time.           | Composer puts agents in the loop of real work, with people, in real time.                | Composer puts agents in the loop of real work, with people, in real time.                    |
| `echo-spaces-again` | Not bolted on. Built in.                                                                                                     | Not bolted on. Built in.                                                                 | Not bolted on. Built in.                                                                     |
| `echo-hub-again`    | DXOS becomes the company's operating system.                                                                                 | DXOS becomes the company's operating system.                                             | DXOS becomes the company's operating system.                                                 |
| `saas-merge`        | Take back control. Build what nobody has built.                                                                              | Take back control. Rebuild the stack. Then build what's next.                            | Take back control. Rebuild the stack. Build what's next.                                     |

**Critique 1** (fresh Fable reviewer, on draft 1):

**Storyline.** All three acts present; Act 3 weakest: ECHO line forbidden, Composer line generic, "Build what nobody has built" says nothing about rebuilding the stack, which is what the screen shows.
**Truth.** "semantic graph" / "agent-native" unbacked. "Updates daily. Costs down." filler. "every platform locked" overstates the brief. "data is the only moat": "only" argues. "full control" unbacked.
**Precision.** "accessible nowhere" false as stated (accessible one app at a time). "fast" vague. "First principles:" a tic and that lab's house phrase, cut. "It doesn't have to be this way" cliché. "Build what nobody has built" vacuous. "integrated into the company's workflows" brochure verb.
**Pacing.** 195 words. `silo-comms` talks costs over a data-flow picture; `spread-comms` "accessible nowhere" while shares visibly flow; `saas-merge` should name the rebuild the screen shows.
**Register.** Holds; "Not ideal" works against the caption. Remove the borrowed phrase and the cliché.
**Rewrite (178 words).** Adopted with edits; see revision 1.

**Critique 2** (fresh Fable reviewer, on revision 1):

**Storyline.** All three acts land; dependence stated, not argued. Three "Then"s in a row make Act 2 a list; "Its data" floats after "Dozens of silos."
**Truth.** No unbacked claims remain.
**Precision.** `dont-panic` reads the caption back: "You don't have to." Point-of-view: `engulf` "You depend" → "Your company depends". Stray comma in `competitors`. "graph" twice across `echo-spaces`/`objects`.
**Pacing.** 181 → 178: "need everything", drop "Then" in `saas-merge`, "all linked".
**Final.** Adopted as the recorded best, except `frontier`: "Enter agents." is kept; the fix is sound.
