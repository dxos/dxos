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
   - **Filter and switch on Maps, then Cloudflare (the Cloudflare connector, a nod to what Composer runs on).**
     Studio, Kanban, Sheet and Tables are already on by default, so they cannot be the plugins switched on.
   - Open a plugin's Details card (its demo video plays).
   - Show the Registry tab: community plugins served from EDGE.
4. **SaaS objects, one graph.** Table, Kanban and Sheet over the same ECHO records.
   - **Create a "Launch" table, add three rows, create a Kanban over the same type pivoted on status, drag a
     card to Done, and watch the table row change.**
   - A sheet budget where changing a cell recomputes the total (the `plugin-sheet` `budget.mjs` demo).
   - Delete a card and restore it (kanban QA-1).
5. **Agents in the document.**
   - **Comment "@kai tighten this paragraph" on a paragraph; Kai rewrites it in place** and says so in the
     thread. It edits directly, with no accept step.
   - **In the companion chat: "Research … and add a Further reading section with three sources."** Verified on
     preview with Claude Sonnet 5: three real, linked sources in about 30 s. WebSearch is Anthropic-only, so the
     flow pins that model.
   - Translate a paragraph in place (APP QA-4).
6. **Projects.** The World Clock project, already built by its agent.
   - **Open the project's Tasks (all done), open a task to see the agent's work, then open the installed
     World Clock and flip the map to a globe.**
   - Scrub the Assistant transcript and Trace panel.
   - Show it in Plugins → Registry as a private plugin (projects QA-2).

   **Caveat.** On EDGE preview, `composer-plugin.mjs` builds the plugin in the local Computer harness and
   loads it from a Vite dev server: there is no Cloudflare Sandbox in that take. Only the registry flow
   (`composer-plugin-registry.mjs`, EDGE dev) runs the agent in a Cloudflare Sandbox and publishes to R2 and D1.
   Per-scene stitching allows recording scene 6 from a dev-EDGE build. Otherwise the VO's Sandbox clause has
   to go.

7. **Inbox.** A synced Gmail mailbox.
   - **Open a thread: show its AI summary, then use AI reply to draft an answer.**
   - **Use Create Project on the message (tying it to scene 6).**
   - Extract contacts from the mailbox (the Extract menu).
8. **Studio.**
   - **Open the "Composer showcase" storyboard: one frame per scene, each carrying its narration as notes, and
     play it.** Setup creates it with `studio.createStoryboard` and generates no media, so the frames are
     placeholders until each scene's clip is attached.
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
> your own device first, in ECHO, Composer's local-first database. **[CF]** It syncs through a mesh of
> Cloudflare Durable Objects at the edge, close to every user.
>
> **(0:40, scene 3)** Everything you see is a plugin. Types, views, operations, even the agent's skills are
> contributed by plugins. Switch them on, swap them out, or write your own.
>
> **(0:55, scene 4)** Here's a table. Add a kanban board over the same records, and it's not a copy: both are
> views over one graph. Move a card, and the table updates. Familiar SaaS tools, minus the silos.
>
> **(1:20, scene 5)** Agents work in your documents the way your colleagues do. Mention Kai in a comment, and
> it rewrites the passage in place. Ask the assistant to research a topic, and it writes the section, with its
> sources. **[CF]** Model calls route through Cloudflare's AI Gateway, to frontier models or to open models on
> Workers AI. You choose.
>
> **(1:48, scene 6)** Projects go further. Describe a plugin, and an agent plans the work, writes the code and
> tests it **[CF]** in a Cloudflare Sandbox. Here it is, installed: a world clock that wasn't part of Composer
> this morning.
>
> **(2:13, scene 7)** Your inbox lives here too. Gmail syncs into your space, so agents can summarize a
> thread, draft a reply, or turn a request into a project.
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
EDGE (on Durable Object alarms) only when its trigger is `remote: true`. The VO no longer claims it; if the
demo mailbox's trigger is remote, scene 7 can add "and it keeps syncing at the edge while your laptop is
closed".

## Recording pipeline

```bash
export DX_EDGE_BASE_URL=https://preview.dxos.network/ DX_ENVIRONMENT=dev DX_PWA=false VITE_DX_DISABLE_ANIMATIONS=true
moon run composer-app:bundle
```

Serve it with the `composer-showcase` launch config (`vite preview` on :4183, so it never collides with another
worktree's :4173). Start the driver with proto's Node first on `PATH`: the World Clock flow spawns the plugin's
Vite server from the driver, and Node 20 cannot load its `dx.config.ts`.

1. **Prepare the profile once (Rich, about 10 min).** Run a manual-mode driver on
   `~/.local/state/dxos/autocue/showcase`, sign in, create a Mailbox named "Gmail", connect it and let it sync.
   Close the window.
2. **Pre-run the coding project** on the same profile with `plugin-computer/autocue/composer-plugin.mjs`. It
   runs unattended for about 20 min. Scene 6 starts from the finished project, and the plugin's dev server
   on :3967 must still be up when scene 6 records. For the Sandbox claim, use the registry variant on EDGE dev
   instead (see the scene 6 caveat).
3. **Record each scene** in record mode on that profile:
   `driver.mjs --url http://localhost:4183 --profile ~/.local/state/dxos/autocue/showcase --out /tmp/showcase/NN`,
   then `steps` and `run` the scene file. Record scene 1 last, so its Home page and navtree show everything the
   other scenes made.
4. **Scene 2:** `pair.mjs --flow packages/apps/composer-app/autocue/two-peer-collaboration.mjs`.
5. **Trim each scene** with `trim-static.mjs --upload off`, with no ident and no voice. Then concatenate the
   scenes in order with ffmpeg's concat demuxer.
6. **Finish:**
   `trim-static.mjs --in showcase.webm --ident composer --voiceover showcase/voiceover-cues.json --duration 170-185 --mp4 --name composer-showcase`.
   Retime the cues against the stitched video first.

`composer-showcase.mjs` is the single-take alternative. It runs every scene's setup first, then scenes 1 and
3–8 straight through after one countdown.

## Task list

### Unblock the flows

- [x] Driver: `--profile` in record mode. It was manual-only before, so every take was a fresh identity.
- [x] Scene 5: `commentAgentMode` is set in Settings → Markdown (`role=combobox[name="Comment agent mode"]`).
- [x] Scene 5: WebSearch works on preview with Claude Sonnet 5.
- [x] `composer-plugin.mjs`: fix the stale plugin-toggle and navtree-row selectors (switch root,
      `branch-trigger`).
- [ ] Rich: prepare the showcase profile with Gmail connected and synced (pipeline step 1).
- [ ] Rich: choose scene 6's source. One option is the preview take (no Sandbox; drop the VO clause). The
      other is the registry take on EDGE dev (Sandbox, R2, D1).
- [ ] Pre-run `composer-plugin.mjs` to the end on the showcase profile.
- [ ] Confirm the Gmail sync trigger is `remote: true` if the VO should claim edge sync.
- [ ] Inbox toolbar actions have no testids, so the flow matches translated labels. Add `data-testid`s for AI
      reply and Create Project.

### Make the flows run

- [x] Scenes 1, 3, 4 and 5 run end to end against EDGE preview (scratch profile, record mode).
- [ ] Scene 6: run against the finished World Clock project.
- [ ] Scene 7: run against the synced mailbox (needs the profile).
- [ ] Scene 8: run. It is untested whether `composer.invoke` resolves the space's database without a
      `spaceId`.
- [ ] Attach each scene's trimmed clip to its storyboard frame (`MediaArtifact.makeVideo({ url })`), so
      scene 8 plays the film itself.
- [ ] Add a stitch script (concat plus one trim pass) if the manual ffmpeg step becomes repetitive.
- [ ] Retime `voiceover-cues.json` against the stitched cut; shorten any cue that overlaps the next.

### Product issues seen while recording

- [ ] A document titled "Local-first software" is named "Localfirst software" in the navtree: the derived
      name drops the hyphen.
- [ ] A new table orders its columns Description, Status, Title; Title should lead.
- [ ] Kanban cards repeat the Title/Status/Description labels with an empty card header; the title is not
      the card's heading.
- [ ] Home → Recent fills with "New message" entries from comment threads.
- [ ] With Numbered headings on, the assistant's "## Further reading" renders as "1). Further reading".
- [ ] A red error indicator appears in the right rail after the kanban drag; check `app.log`.
- [ ] Settings toggles the sidebar closed when pressed while settings are open, so the flows open settings
      by URL.
- [ ] On reload, a profile whose last view was Settings restores with no plank, so the driver's ready check
      (`deck.plank`) times out.
- [ ] Other committed flows still use the old `input[id="<plugin>-input"]` toggle selector
      (`plugin-claude/autocue/claude-code-task.mjs`, `plugin-projects/autocue/composer-plugin-desktop.mjs`,
      `composer-app/autocue/desktop-input.mjs`).

### Polish

- [ ] Sharp Sans font in `tools/ident/public/fonts/` for the ident.
- [ ] A short title card at 0:06: "Composer — the open-source super app".
- [ ] Review the closing claims with Rich: "sovereign AI", the URL.
