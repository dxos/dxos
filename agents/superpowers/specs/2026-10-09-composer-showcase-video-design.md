# Composer showcase video (3:00)

A three-minute film that makes three points: Composer is **one app for sovereign AI**, it is **extensible
all the way down**, and it **runs on Cloudflare**. It is recorded with autocue against EDGE preview,
narrated with HeyGen, and bookended with the `tools/ident` Composer intro and DXOS end card (#13871).

Decisions (2026-10-09): Rich's real Gmail account on a prepared profile; one headless recorded flow per scene,
stitched; the coding project is pre-run and shown finished; EDGE preview; no project registration.

## Scenes

| #   | Scene                              | Time      | Flow (`packages/apps/composer-app/autocue/showcase/`) | Spec anchor                         |
| --- | ---------------------------------- | --------- | ----------------------------------------------------- | ----------------------------------- |
| 0   | Composer ident                     | 0:00–0:06 | `--ident composer` (trimmer)                          | —                                   |
| 1   | What Composer is                   | 0:06–0:18 | `01-home.mjs`                                         | APP QA-13 step 1                    |
| 2   | Real-time collaboration            | 0:18–0:40 | `two-peer-collaboration.mjs` via `pair.mjs`           | APP QA-8                            |
| 3   | The plugin gallery                 | 0:40–0:55 | `03-plugins.mjs`                                      | APP QA-13 step 3                    |
| 4   | SaaS objects on one ECHO graph     | 0:55–1:20 | `04-objects.mjs`                                      | table QA-1, kanban QA-1, sheet QA-1 |
| 5   | Agents in the document             | 1:20–1:48 | `05-agent.mjs`                                        | APP QA-3, QA-4                      |
| 6   | Projects: an agent writes a plugin | 1:48–2:13 | `06-project.mjs` (after `composer-plugin.mjs`)        | projects QA-2                       |
| 7   | Inbox                              | 2:13–2:35 | `07-inbox.mjs`                                        | inbox QA-1                          |
| 8   | Studio: how this film was made     | 2:35–2:54 | `08-studio.mjs`                                       | studio QA-1                         |
| 9   | End card                           | 2:54–3:00 | `--ident composer` (trimmer)                          | —                                   |

`composer-showcase.mjs` runs scenes 1 and 3–8 back to back in one take. Scene 2 needs two identities and is
recorded by `pair.mjs` separately, then spliced in at 0:18.

## Shot list and candidate actions

Each scene lists 2–3 candidate actions. **Bold** marks the one the flow performs; the others are alternates
if the first does not hold up on camera.

1. **What Composer is.** A populated space on its Home page.
   - **Sweep the navtree across documents, a sheet, a table, a board and a mailbox.**
   - Open the Home dashboard section.
   - Collapse and expand the sidebar to show the deck of planks.
2. **Collaboration.** Alice and Bob in one space, side by side.
   - **Bob's edits stream into Alice's document as he types.**
   - Bob comments on Alice's paragraph; the thread appears for her.
   - Alice invites Bob from the notifications inbox (APP QA-12).
3. **Plugin gallery.** Plugins → Registry.
   - **Filter, read a plugin card (its demo video plays), switch Maps on.**
   - Switch on Studio, which scene 8 needs.
   - Show the Registry tab: community plugins served from EDGE.
4. **SaaS objects, one graph.** Table, Kanban and Sheet over the same ECHO records.
   - **Create a "Launch" table, add three rows, create a Kanban over the same type pivoted on status, drag a
     card to Done, and watch the table row change.**
   - A sheet budget where changing a cell recomputes the total (the `plugin-sheet` `budget.mjs` demo).
   - Delete a card and restore it (kanban QA-1).
5. **Agents in the document.**
   - **Comment "@kai tighten this paragraph" on a paragraph; Kai proposes an edit; accept it.**
   - **In the companion chat: "Research local-first software and add a short section with sources."**
     The WebSearch skill is Anthropic-only, so the flow pins a Claude model.
   - Translate a paragraph in place (APP QA-4).
6. **Projects.** The World Clock project, already built by its agent.
   - **Open the project's Tasks (all done), open a task to see the agent's work, then open the installed
     World Clock and flip the map to a globe.**
   - Scrub the Assistant transcript and Trace panel.
   - Show it in Plugins → Registry as a private plugin (projects QA-2).
7. **Inbox.** A synced Gmail mailbox.
   - **Open a thread: show its AI summary, then use AI reply to draft an answer.**
   - **Use Create Project on the message (tying it to scene 6).**
   - Extract contacts from the mailbox (the Extract menu).
8. **Studio.**
   - **Open the "Showcase" storyboard: one frame per scene, the narration script as instructions, and play
     it.**
   - Generate a thumbnail variant with Ideogram.
   - Show the HeyGen voice-over artifact with its script.

## Voice-over

About 410 words at ~150 wpm, timed to the scene table. `[CF]` marks the Cloudflare claims; each is checked
against the edge repo (see "Cloudflare facts").

> **(0:00, ident)** This is Composer… by DXOS.
>
> **(0:06, scene 1)** Composer is an open-source super-app framework. Your documents, spreadsheets, boards,
> mail and AI agents live together in one workspace, and every byte of it belongs to you.
>
> **(0:18, scene 2)** Invite someone, and you're editing together in real time. Every change is stored on
> your own device first, in ECHO, Composer's local-first database, and synced peer to peer. **[CF]** The
> relay is a mesh of Cloudflare Durable Objects that coordinate each space's replication at the edge, close
> to every user.
>
> **(0:40, scene 3)** Everything you see is a plugin. Types, views, operations, even the agent's skills are
> all contributed by plugins, and you can switch them on, swap them out, or write your own.
>
> **(0:55, scene 4)** Here's a table. Add a kanban board over the same records, and it's not a copy: both are
> views over one graph. Move a card, and the table updates. Familiar SaaS tools, minus the silos.
>
> **(1:20, scene 5)** Agents work in your documents the way your colleagues do. Mention Kai in a comment and
> it proposes an edit you can accept or reject. Ask the assistant to research a topic, and it writes the
> section with its sources. **[CF]** Model calls route through Cloudflare's AI Gateway, to frontier models or
> to open models running on Workers AI. You choose.
>
> **(1:48, scene 6)** Projects go further. Describe a plugin, and an agent plans the work, writes the code
> and tests it. **[CF]** It runs in a Cloudflare Sandbox, a container spun up on demand, and then publishes
> the plugin to your private registry, stored in R2 and D1. Here it is, installed: a world clock that wasn't
> part of Composer this morning.
>
> **(2:13, scene 7)** Your inbox lives here too. Gmail syncs into your space, so agents can summarize a
> thread, draft a reply, or turn a request into a project. **[CF]** Sync runs on a schedule kept by Durable
> Object alarms, even when your laptop is closed.
>
> **(2:35, scene 8)** And this film? It was made in Composer. The script, the storyboard and the voice-over
> are objects in a Studio space, and the screen recordings were driven by an agent, step by step.
>
> **(2:54, end card)** Composer. One app for sovereign AI, extensible by design, built on Cloudflare. Open
> source, at composer.space.

`voiceover-cues.json` (next to the flows) holds the same lines as `[{ at, text }]` cues for `voiceover.mjs`.
Per-step `narration` in the flows covers single-scene cuts made with `--voiceover steps`.

## Cloudflare facts (verified 2026-10-09, edge `origin/main` bf87955e)

| Claim in the VO                                       | Evidence (edge `packages/services/`)                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Signaling and space replication on Durable Objects    | `edge/wrangler.jsonc:269-281` (Router, Swarm); `db-service/wrangler.jsonc:132-144` |
| Model calls via AI Gateway; open models on Workers AI | `ai-service/wrangler.jsonc:25,32`; `ai-service/src/ai-providers.ts:32-64`          |
| Coding sandboxes on the Sandbox SDK and Containers    | `sandbox-service/wrangler.jsonc:40-52`                                             |
| Private plugin registry in R2 and D1                  | `registry-service/wrangler.jsonc:50,58`                                            |
| Remote sync triggers on Durable Object alarms         | `compute-service/src/triggers/scheduler-object.ts:153`                             |
| Files and blobs in R2                                 | `blob-service/wrangler.jsonc:45`                                                   |

Do **not** claim Email Routing, Workflows, Vectorize or Browser Rendering: none are used. Gmail sync runs on
EDGE only when its trigger is `remote: true`; confirm the demo mailbox's trigger is, or drop the "laptop
closed" clause.

## Recording pipeline

```bash
export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
moon run composer-app:bundle
pnpm exec vite preview --configLoader native --port 4173 --strictPort   # in packages/apps/composer-app
```

1. **Prepare the profile once (Rich, about 10 min).** In manual mode on `~/.local/state/dxos/autocue/showcase`,
   sign in, then connect Gmail in a Mailbox and let it sync. Close the window.
2. **Pre-run the coding project** on the same profile: `plugin-computer/autocue/composer-plugin.mjs`
   (about 20 min, unattended). Scene 6 starts from its finished project.
3. **Record each scene** in record mode on that profile (`--profile` now works in record mode):
   `driver.mjs --profile ~/.local/state/dxos/autocue/showcase --out /tmp/showcase/NN`, then `run` the scene.
4. **Scene 2:** `pair.mjs --flow packages/apps/composer-app/autocue/two-peer-collaboration.mjs`.
5. **Trim each scene** with `trim-static.mjs --upload off` (no ident, no voice), then concatenate them in order
   with ffmpeg's concat demuxer.
6. **Finish:** `trim-static.mjs --in showcase.webm --ident composer --voiceover voiceover-cues.json --duration
170-185 --mp4 --name composer-showcase`. Retime the cues against the stitched video first.

## Task list

### Unblock the flows

- [x] Driver: `--profile` in record mode (was manual-only, so every take was a fresh identity).
- [ ] Rich: prepare the showcase profile with Gmail connected and synced (step 1 above).
- [ ] Confirm the Gmail sync trigger runs remotely (`remote: true`), or soften the VO line.
- [ ] Pre-run `composer-plugin.mjs` on the profile and keep the finished World Clock project.
- [ ] Scene 5: decide where `commentAgentMode` is set (Settings → Markdown) and confirm its selector.
- [ ] Scene 5: confirm the WebSearch skill works on preview with a Claude model; otherwise use translate.
- [ ] Scene 8: create the "Showcase" storyboard (one frame per scene) and the HeyGen VO artifact in setup;
      Ideogram needs a credential for the thumbnail alternate.
- [ ] Inbox toolbar actions have no testids; add `data-testid`s for Reply, AI reply and Create Project
      rather than matching translated labels.

### Make the flows run

- [ ] Run each scene flow end to end and fix selectors (none has run yet; selectors come from the research
      and from neighbouring committed flows).
- [ ] Seed scene 1's space so the navtree sweep has something to show (plugin-debug "Generate Objects" or the
      earlier scenes' objects).
- [ ] Add a stitch script (concat plus one trim pass) if the manual ffmpeg step becomes repetitive.
- [ ] Retime `voiceover-cues.json` against the stitched cut; shorten any cue that overlaps the next.

### Polish

- [ ] Sharp Sans font in `tools/ident/public/fonts/` for the ident.
- [ ] A short title card at 0:06: "Composer — the open-source super app".
- [ ] Review the closing claims with Rich: "sovereign AI", the URL.
