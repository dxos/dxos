# @dxos/stories-agent

Storybook stories that prototype agents on Discord end to end: installing the DXOS Discord app (Kai) in a server,
connecting Discord channels to an agent in a durable test space, and talking to the agent from Discord. Design:
[plugin-agent `docs/DISCORD.md`](../../plugins/plugin-agent/docs/DISCORD.md).

## Setup

The stories talk to a real EDGE, so set that up first with plugin-agent's
[SETUP.md](../../plugins/plugin-agent/docs/SETUP.md): the Discord apps and Kai's portal settings, local EDGE, and
the environment table. Then, from `<dxos>`:

```bash
moon run storybook-react:serve
```

Open the stories in **Chrome** at `http://localhost:9009/?path=/story/stories-stories-agent-…`. By default the
stories use persistent storage, which runs the client in a SharedWorker; the Claude desktop app's built-in browser
blocks SharedWorker requests, so they cannot boot there unless the `persistent` arg is off.

The **Setup** story's `persistent` arg (Controls) keeps the profile across reloads; changing it reboots the story. Its
toolbar picks the EDGE the client talks to (local, dev, preview or production; local by default) and has **Reset**,
which wipes the profile so setup seeds a fresh space. Both take effect on reload. Moving a persistent profile to
another EDGE resets it, since it is registered with the old one.

## Try it

In the **Setup** story:

1. **Discord** panel → **Connect Discord** (toolbar) signs you in; the servers you administer appear.
2. On a server without Kai, **Install** (+) opens Discord's consent page; then **Refresh**.
3. Click a server where Kai is installed, then **Connect** (plug) a channel under **Channels**.
4. **Activity** toolbar → **Connect channels** (plug) starts the bot; the **Discord bot** panel reaches ready.
5. Mention `@Kai` in that channel. Kai replies in a thread once its turn ends, and the conversation appears under
   **Activity → Conversations**.

In the **DiscordPipeline → Setup** story (`?path=/story/stories-stories-agent-discordpipeline--setup`), a Discord
back-index runs as a remote timer trigger on EDGE: plugin-discord's `CrawlDiscordChannels` reads the channels' history
with the Discord token stored in the space, keeps its progress in a `CrawlState` object and appends the facts it
extracts to a fact feed; the agent's brain indexes the fact feed once it is registered.

1. **Discord** panel: sign in, install Kai and **Connect** a channel, as steps 1 to 3 above. The sign-in stores the
   Discord connection, and its token, in the space.
2. **Discord back-index** panel: pick the **Connection**, check the channel under **Channels**, set **Max days**
   (e.g. 30), leave **Descend threads** on, and pick an **Interval**.
3. **Start**: the crawl state, the fact feed and the trigger are created, and the channel appears under **Targets**.
   Each run of the trigger, or **Run now**, moves the targets' cursors and the **Messages read** and **Facts in the
   feed** counters; the **Timeline** records each change of the crawl state.
4. Switch **Agent brain** on: the brain indexes the fact feed, and the **brain** companion lists the facts.
5. **Pause** and **Resume** switch the trigger off and on; a row's reset button re-reads that channel or thread from
   the start, and **Reset all** re-reads every target, without a model call for a message read before.

The **DiscordPipeline → Scripted** story runs the same panel with EDGE faked (`startFakeBackIndexRunner` steps the
crawl state while the trigger is on, `installFakeBrain` answers the fact feed routes), with no Discord or EDGE at all.

## Troubleshooting

Problems with EDGE, the Discord apps or the bot are in [SETUP.md](../../plugins/plugin-agent/docs/SETUP.md#troubleshooting).
These are specific to the stories:

| Symptom | Cause |
| --- | --- |
| The story never finishes loading, "coordinator worker error" | Opened in the Claude desktop app's browser; use Chrome. |
| **Install** opens a different Kai, or the bot never starts | The profile predates per-environment Kai apps and records the old app id; **Reset** it. |
| **Connect channels** is greyed out | No channel is connected yet (Try it, step 3). |
| Agent messages fail with "No process is hosted by this object" | The space outlived the EDGE state its agent ran on; clear the site data for `localhost:9009` and reload. |
