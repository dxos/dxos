---
title: Composer showcase
app: composer-app bundle against EDGE preview, served by the `composer-showcase` launch config on :4183
profile: ~/.local/state/dxos/autocue/showcase
intro: composer
voice: Britpop
length: 3:00
---

<!--
How to read this document (autocue's natural-language flow format).

- Each `##` heading is a scene; each paragraph under it is one step: a stage direction, then the step's narration
  as bullets. Bullets are spoken, in order, while the step plays; a step with no bullets is silent.
- Stage directions are written as a person would follow them. `> Expect:` says what must be on screen before the
  next step starts; a step that does not reach it fails.
- `Setup` sections are off camera. They run first, and the recording starts after the last one.
- Marks in a direction: _(wait)_ cuts the wait out of the video (an agent working); _(hold)_ holds the shot; text in
  quotes is typed: the first few words at reading pace, then cut to the end, then a half-second beat.
- The picture waits for the narrator: a step lasts at least as long as its bullets take to speak.

The committed scripts this was written from are `packages/apps/composer-app/autocue/showcase/*.mjs`, joined by
`autocue/composer-showcase.mjs`; the test they satisfy is `spec/APP.mdl` QA-13.
-->

# Composer showcase

One app for sovereign AI, extensible by design, built on Cloudflare.

## Setup

Dismiss any first-run notice, open the space's Home, and close any companion or context panel.

In Settings → Markdown, set Comment agent mode to "mention". In Settings → Assistant, set the remote language model
to Claude Sonnet 5 (web research needs an Anthropic model).

Create a document "Why local first" holding one wordy paragraph about local-first software.

Check that the World Clock project exists and its plugin is loaded (the coding agent built it before the take).

Check that a mailbox named "Gmail" exists and has synced.

Create a Studio storyboard "Composer showcase" with one frame per scene, each frame's notes holding its narration.

## 1. What Composer is

Open on the space's Home page with the caption "Composer — the open-source super app". _(hold)_

- Composer is an open-source super-app framework. Your documents, spreadsheets, boards, mail and AI agents live
  together in one workspace.

Sweep the pointer down the objects in the navtree, one at a time.

- And every byte of it belongs to you.

## 2. Real-time collaboration

Recorded separately with two browsers side by side (`autocue/two-peer-collaboration.mjs`). Alice and Bob share a
space; Bob types into Alice's document and his edits stream in as he types.

- Invite someone, and you're editing together in real time.
- Every change is stored on your own device first, in ECHO, Composer's local-first database, and syncs through a
  mesh of Cloudflare Durable Objects at the edge, close to every user.

## 3. The plugin gallery

Open Plugins from the rail. The companion panel closes.

- Everything you see is a plugin.

Filter for "explorer" and switch Explorer on.

> Expect: Explorer is active.

- Types, views, operations, even the agent's skills are all contributed by plugins.

Filter for "cloudflare" and switch Cloudflare on.

> Expect: Cloudflare is active.

- Switch them on, swap them out, or write your own.

## 4. SaaS objects on one graph

Add to space → Table, named "Launch", with no type (it gets Title, Status and Description).

- Here's a table.

Add three rows: "Write the announcement", "Record the demo", "Ship the release".

- Each row is an object in your space.

Add to space → Kanban, named "Launch board", with card type "Launch" and pivot column "status".

> Expect: the three cards sit in Uncategorized, beside Todo, In Progress and Done.

- Add a kanban board over the same records. It's not a copy: both are views over one graph.

Add to space → Explorer, named "Launch graph", with type "Launch".

> Expect: the graph draws the space's objects and their links.

- And Explorer, switched on a moment ago, draws the whole space as one graph of connected objects.

Open the board and drag "Write the announcement" to Done, then open the table.

> Expect: the row's Status reads Done.

- Move a card, and the table updates. Familiar SaaS tools, minus the silos.

## 5. Agents in the document

Open "Why local first".

- Agents work in your documents the way your colleagues do.

Select the paragraph, add a comment, and type "@kai tighten this paragraph". Kai rewrites the paragraph and says so
in the thread. _(wait)_

- Mention Kai in a comment, and it rewrites the passage in place.

In the document's Assistant, type "Research the history of local-first software and add a short Further reading
section to this document with three sources, each with a one-line summary." _(wait)_

> Expect: the document ends with a Further reading section of three linked sources.

- Ask the assistant to research a topic, and it writes the section, with its sources.

Scroll to the new section. _(hold)_

- Model calls route through Cloudflare's AI Gateway, to frontier models or to open models on Workers AI. You choose.

## 6. Projects: an agent writes a plugin

Open the World Clock project's Tasks.

- Projects go further. Describe a plugin, and an agent plans the work, writes the code and tests it.

Select the first three tasks in turn.

- It runs in a sandbox at the edge, and every step it took is recorded on the project.

Open Clocks from the navtree and switch the map to the globe. _(hold)_

- Here it is, installed: a world clock that wasn't part of Composer this morning.

## 7. Inbox

Open the "Gmail" mailbox.

- Your inbox lives here too. Gmail syncs into your space.

Open a thread and show its summary.

- Agents summarize a thread before you read it.

Press AI reply. A draft appears; nothing is sent. _(wait)_

- Draft a reply in your voice.

Press Create Project on the message. _(wait)_

> Expect: a project made from the message opens on its Tasks.

- Or turn a request into a project.

## 8. Studio: how this film was made

Open the "Composer showcase" storyboard.

- And this film? It was made in Composer.

Play it; until the frames carry their clips, step through them instead. _(hold)_

- The script, the storyboard and the voice-over are objects in a Studio space, and the screen recordings were
  driven by an agent, step by step.

## End card

- Composer. One app for sovereign AI, extensible by design, built on Cloudflare. Open source, at composer.space.
