# Candidate clips — mark this list

**What to do:** put a mark in the last column of every row. Nothing gets scripted until
this list is marked. Feel free to strike rows, rewrite a "what you see", or add rows at
the bottom of a section.

| Mark | Meaning                                                               |
| ---- | --------------------------------------------------------------------- |
| `Y`  | Works today, I could shoot it this afternoon.                         |
| `S`  | Works, but needs setup (data, config, a second identity, an API key). |
| `B`  | Half-works / flaky / ugly — would need a fix first.                   |
| `N`  | Not built.                                                            |
| `?`  | Not sure — agent should go and find out.                              |
| `*`  | Suffix on any mark: **must be in the video**, regardless of cost.     |

**Cuts** — which videos a clip could serve: `C`loudflare · `D`eveloper · `P`rosumer · `I`nvestor.
**Cost** — production cost: S (stage + shoot), M (needs seed data or a harness), L (needs new tooling, a second machine, or the `edge` repo).

---

## 1. Basic Composer

| ID  | Clip               | What you see                                                                         | The "wait, what?"                                    | Cuts  | Cost | Mark |
| --- | ------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----- | ---- | ---- |
| B1  | First run          | Fresh identity → Bramble sample space appears fully populated, zero setup.           | A workspace that arrives with a world already in it. | P I   | S    |      |
| B2  | Create a space     | New space, name it, first object. Real URL in frame (preview.composer.space).        |                                                      | P     | S    |      |
| B3  | Invitation         | Share button → QR/code → second window joins → both editing.                         | No account, no server, no email — a code.            | C P I | M    |      |
| B4  | Deck layout        | Drag three surfaces side by side; rearrange; collapse; solo.                         | The whole app is one composable surface, not tabs.   | D P   | S    |      |
| B5  | Plugin registry    | Settings → registry → toggle three plugins on → new object types appear immediately. | Turning on a plugin doesn't reload the app.          | D I   | S    |      |
| B6  | Spotlight / search | Cmd-K across everything — objects, actions, plugins.                                 |                                                      | P     | S    |      |
| B7  | Settings + theme   | Density, theme, keyboard shortcuts. Dark/light snap.                                 |                                                      | P     | S    |      |

## 2. Core plugins

| ID  | Clip                    | What you see                                                                     | The "wait, what?"                                   | Cuts    | Cost | Mark |
| --- | ----------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- | ------- | ---- | ---- |
| K1  | Markdown                | Cupping-notes doc: live formatting, slash menu, embedded object reference.       |                                                     | P       | S    |      |
| K2  | Tables                  | Contacts → Organizations as a table; add a column with a _type_; sort/filter.    | The column has a schema, not a format.              | D P     | M    |      |
| K3  | Sheets                  | Green-coffee inventory sheet; a formula; a cell referencing an ECHO object.      | A spreadsheet cell pointing at a live database row. | D P     | M    |      |
| K4  | Kanban                  | Same organizations, now grouped by relationship; drag a card between columns.    | Same data, third rendering, no export.              | P I     | M    |      |
| K5  | Drawings                | Roastery floor plan / flavour wheel in tldraw; collaborative cursor.             |                                                     | P       | S    |      |
| K6  | Map                     | Organizations plotted — Oakland, Portland, Brooklyn, Austin, Colombia, Ethiopia. |                                                     | P I     | M    |      |
| K7  | One dataset, four views | Table → kanban → map → chart on the _same_ objects, in four seconds.             | This is the single best 10 seconds in the product.  | C D P I | M    |      |

## 3. Companions

| ID  | Clip                | What you see                                                             | The "wait, what?"                     | Cuts | Cost | Mark |
| --- | ------------------- | ------------------------------------------------------------------------ | ------------------------------------- | ---- | ---- | ---- |
| N1  | Companion panel     | Open a document, companion shows related objects / assistant / comments. |                                       | P    | S    |      |
| N2  | Object companion    | Select an Organization; companion shows its People, mail, tasks.         | The graph is always one panel away.   | D P  | M    |      |
| N3  | Assistant companion | Assistant attached to the object in focus, already grounded in it.       | No copy-paste to give the AI context. | P    | M    |      |
| N4  | Comments companion  | Threads anchored to a text range, resolved inline.                       |                                       | P    | M    |      |

## 4. Collaboration

| ID  | Clip                  | What you see                                                                               | The "wait, what?"                                                    | Cuts  | Cost | Mark |
| --- | --------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----- | ---- | ---- |
| L1  | Live co-editing       | Two windows, two cursors, one document, sub-second.                                        |                                                                      | C P I | M    |      |
| L2  | **Offline merge**     | Window B goes offline (devtools), both edit the same paragraph, B reconnects, texts merge. | No conflict dialog. No "last write wins". _Partner beat: Automerge._ | C D I | M    |      |
| L3  | Version history       | Document revisions; scrub; restore; diff against a branch.                                 |                                                                      | D P   | M    |      |
| L4  | Comments + review     | Comment thread → suggested change → accept.                                                |                                                                      | P     | M    |      |
| L5  | Presence across types | Two people in the same kanban / sheet / drawing, not just text.                            | CRDT collaboration on a _spreadsheet_.                               | D I   | M    |      |

## 5. Assistant

| ID  | Clip                  | What you see                                                                        | The "wait, what?"                         | Cuts  | Cost | Mark |
| --- | --------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- | ----- | ---- | ---- |
| A1  | Ask the space         | "Which contacts haven't I replied to?" — answer cites real objects, links navigate. | The citations are live objects, not text. | C P I | M    |      |
| A2  | Create a document     | Assistant drafts the Spring Blend launch brief into a real document.                |                                           | P     | S    |      |
| A3  | Generate a diagram    | "Diagram our supply chain" → mermaid diagram rendered as an object.                 |                                           | P I   | S    |      |
| A4  | Generate a table      | "Build a table of wholesale accounts by reorder cadence" → a real, typed table.     | It made a _schema_, then filled it.       | C D I | M    |      |
| A5  | Edit in place         | Assistant edits an existing document; changes stream into the open editor.          |                                           | P     | S    |      |
| A6  | Assistant + selection | Select text → ask about it → answer scoped to the selection.                        |                                           | P     | S    |      |

## 6. ECHO

| ID  | Clip               | What you see                                                                           | The "wait, what?"                              | Cuts  | Cost | Mark |
| --- | ------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------- | ----- | ---- | ---- |
| E1  | **Explorer graph** | Force-directed graph of the whole Bramble space; hover a node; click → deck navigates. | Your documents were a database the whole time. | C D I | M    |      |
| E2  | Live query         | Write a query; results populate; mutate an object elsewhere; results update live.      | No refresh. No subscription code.              | C D   | M    |      |
| E3  | Schema / types     | Inspect an Organization's schema; add a field; every view updates.                     |                                                | D     | M    |      |
| E4  | Refs and DXNs      | Follow a Ref from Person → Organization → its mail. Show the DXN.                      | Every object has a URL.                        | D     | M    |      |
| E5  | Local-first proof  | Devtools → storage. Kill the network. Everything still works.                          | The database is on your machine.               | C D I | S    |      |
| E6  | Devtools panel     | ECHO devtools: spaces, objects, mutations streaming past.                              |                                                | D     | S    |      |

## 7. Agent runtime

| ID  | Clip                 | What you see                                                                        | The "wait, what?"                                   | Cuts | Cost | Mark |
| --- | -------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- | ---- | ---- | ---- |
| G1  | **Trace panel**      | Assistant answers; trace panel shows tool calls, arguments, typed results, timings. | _Partner beat: Effect._                             | C D  | M    |      |
| G2  | Tools are operations | Point at a tool call, then at the plugin operation that defines it.                 | Every plugin action is automatically an agent tool. | C D  | M    |      |
| G3  | Skills               | A skill registered by a plugin, invoked by the agent.                               |                                                     | D    | M    |      |
| G4  | Error handling       | A tool fails; the typed error surfaces and the agent recovers.                      |                                                     | D    | M    |      |
| G5  | Agent on the edge    | The same agent running as an EDGE service, not in the tab.                          | Same runtime, two locations.                        | C D  | L    |      |

## 8. Advanced plugins — mail and CRM

_Gmail is mocked locally (synthetic mailbox in the demo seed). The real OAuth connect flow is deliberately not shown._

| ID  | Clip            | What you see                                                                   | The "wait, what?"                           | Cuts | Cost | Mark |
| --- | --------------- | ------------------------------------------------------------------------------ | ------------------------------------------- | ---- | ---- | ---- |
| M1  | Inbox           | Bramble mailbox, threads, summaries above conversations.                       |                                             | P    | M    |      |
| M2  | Unsubscribe     | Subscriptions folder → bulk senders → one click.                               |                                             | P    | M    |      |
| M3  | Auto-drafts     | Agent drafts replies grounded in the space, not just the thread.               | It knows who Carmen is.                     | P I  | M    |      |
| M4  | CRM curation    | Mail → extracted People and Organizations, deduped, linked.                    | Your inbox became a CRM without you typing. | P I  | M    |      |
| M5  | Pipeline stages | Wholesale accounts moving through pipeline stages; history.                    |                                             | P    | M    |      |
| M6  | Mail → task     | A thread becomes a task in the Spring Blend project, still linked to the mail. |                                             | P    | M    |      |

## 9. Advanced scenarios

| ID  | Clip                  | What you see                                                           | The "wait, what?" | Cuts | Cost | Mark |
| --- | --------------------- | ---------------------------------------------------------------------- | ----------------- | ---- | ---- | ---- |
| X1  | Project management    | Spring Blend Launch: tasks, assignees, statuses, linked docs and mail. |                   | P I  | M    |      |
| X2  | Pipelines             | A processing pipeline over incoming mail — stages, outputs.            |                   | D I  | L    |      |
| X3  | Automation / triggers | Something happens on a schedule or on a change, with no server.        |                   | D I  | L    |      |
| X4  | A day at Bramble      | 30 s montage — mail → task → doc → agent → shipped. Hero-cut closer.   |                   | P I  | M    |      |

## 10. Plugin development

| ID  | Clip                     | What you see                                                                    | The "wait, what?"                                       | Cuts  | Cost | Mark |
| --- | ------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------- | ----- | ---- | ---- |
| V1  | **Chess in two minutes** | Claude Code + the DXOS skill scaffolds a plugin; it appears in the running app. | From nothing to a working collaborative app, on camera. | C D I | L    |      |
| V2  | Plugin anatomy           | The file that defines a plugin: schema, surface, operations. Under 50 lines.    |                                                         | D     | S    |      |
| V3  | MCP server               | Claude talking to a live Composer space over MCP.                               |                                                         | C D   | L    |      |
| V4  | CLI                      | Driving a space from the terminal.                                              |                                                         | D     | M    |      |
| V5  | Claude Code skills       | The repo's own skills steering an agent through a real change.                  |                                                         | D     | M    |      |
| V6  | Hot reload               | Edit plugin source; the running app updates without losing state.               |                                                         | D     | M    |      |

## 11. Advanced plugins II

| ID  | Clip          | What you see                                              | The "wait, what?"                            | Cuts | Cost | Mark |
| --- | ------------- | --------------------------------------------------------- | -------------------------------------------- | ---- | ---- | ---- |
| Z1  | Meetings      | A meeting object: participants, notes, transcript.        |                                              | P I  | L    |      |
| Z2  | Transcription | Live transcript streaming into a document.                |                                              | P I  | M    |      |
| Z3  | Translation   | Content translated in place.                              |                                              | I    | ?    |      |
| Z4  | Magazine      | The magazine reading surface.                             |                                              | I    | M    |      |
| Z5  | 3D / voxel    | A 3D surface as a first-class object in the deck.         | A voxel scene next to a spreadsheet.         | I    | M    |      |
| Z6  | Games         | Chess or another game, played collaboratively in a space. | Multiplayer game state is just ECHO objects. | D I  | M    |      |

## 12. Mobile and native

| ID  | Clip               | What you see                                                   | The "wait, what?"          | Cuts  | Cost | Mark |
| --- | ------------------ | -------------------------------------------------------------- | -------------------------- | ----- | ---- | ---- |
| T1  | **Native desktop** | Tauri build beside the browser, mutating the same live object. | _Partner beat: Tauri._     | C D I | L    |      |
| T2  | iOS                | Composer on a phone, same space.                               |                            | P I   | L    |      |
| T3  | Native filesystem  | A local folder as space content.                               | Your files, not an upload. | D     | M    |      |
| T4  | Offline on device  | Phone in airplane mode, edits, reconnects, merges.             |                            | C I   | L    |      |

## 13. EDGE and Cloudflare

_Depends on the sibling repo at `/Users/burdon/Code/dxos/edge` — not this worktree._

| ID  | Clip                            | What you see                                                                                                                     | The "wait, what?"                               | Cuts | Cost | Mark |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---- | ---- | ---- |
| W1  | **Architecture**                | Animated diagram: device ↔ Worker ↔ Durable Object ↔ R2/D1. Built in Composer itself.                                            | The diagram is a live object in the product.    | C I  | M    |      |
| W2  | **A space is a Durable Object** | Follow one space's sync into the DO that hosts it.                                                                               | The sync engine _is_ a Durable Object.          | C D  | L    |      |
| W3  | The services fleet              | `packages/services/*` — ~25 Workers: agents, ai, blob, calls, db, functions, hub, identity, kms, mcp, registry, router, sandbox. | The whole backend is Workers.                   | C I  | M    |      |
| W4  | Deploy                          | `./scripts/deploy.mjs --env staging` → live.                                                                                     |                                                 | C D  | L    |      |
| W5  | Observability                   | Grafana log explorer + metrics; Hub admin at hub.dxos.network/admin.                                                             |                                                 | C    | M    |      |
| W6  | Primitives in anger             | The binding counts: 49 DO, 42 KV, 29 D1, 27 R2, 8 Queues, 8 Workers AI, 2 Containers.                                            | Not a demo app — a real Workers-native product. | C I  | S    |      |
| W7  | Edge AI                         | ai-service / Workers AI serving the assistant.                                                                                   |                                                 | C    | L    |      |

---

## Additions

_Add rows here._

| ID  | Clip | What you see | The "wait, what?" | Cuts | Cost | Mark |
| --- | ---- | ------------ | ----------------- | ---- | ---- | ---- |
|     |      |              |                   |      |      |      |
