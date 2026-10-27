# Show-and-tell curator

An agent that owns one Discord channel for demos and links. People drop a link or upload a recording there; the
agent files one row per link (date, author, link, title, category, one-line summary) and reacts 🗂️. Mention the
agent and ask "what did we do this week?" and it answers in a thread from the rows.

## How it works

| Piece                                     | Where                                | What it does                                                                                   |
| ----------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `DiscordChannel.curate`                   | the Discord channel config           | Lists the channels whose unaddressed messages with a link or attachment reach the agent.       |
| Curated routing                           | EDGE discord-service (`pipeline.ts`) | Submits such a message with `addressed: curate` in its header and its attachment list.         |
| `ShowAndTell.Entry`                       | plugin-discord types                 | One row. Keyed by message and link, so a redelivered message is filed once.                    |
| `FileLinks`, `ListLinks`                  | plugin-discord operations            | File a message's links; list a period's rows with a digest grouped by author.                  |
| Show-and-tell curator skill               | plugin-discord skills                | Tells the agent to file `curate` messages silently and to answer summary questions.            |
| `Show-and-tell` mode, `EnableShowAndTell` | plugin-discord operations            | Creates the mode on the agent, curates the channel, and switches the agent's own chat into it. |

Each Discord conversation's chat copies the skills of the agent's own chat, so the mode is set once, on the agent.

## Set it up

1. Make the bot and add it to the server, as in discord-service's `agent-bot/README.md` (steps 1 and 2). Turn on
   **Message Content Intent**, or messages arrive with no text and no links.
2. In Composer, create the agent and its Discord channel (Activity → Channels). For your own bot, paste the bot
   token into the channel form: it is stored as an `AccessToken` in the space. Never put a token in a file in the
   repository, in a commit or in chat. For Kai, leave the token empty: EDGE holds it.
3. Copy the demos channel's id (Discord: Developer Mode, right-click the channel, **Copy Channel ID**).
4. Switch the agent on as curator: invoke `EnableShowAndTell` with the agent, its Discord channel and the channel id.
   In storybook, the `DiscordAgent` → `ShowAndTell` story does this from its `channelId` control.
5. Activity: **Connect channels** (re)starts the bot, which reads `curate` from the config.
6. To see the table, open the `Show-and-tell entry` type as a table in the space.

To stop curating, remove the channel id from the config's **Show-and-tell channels** and reconnect.

## Limits

- Discord attachment URLs expire within a day, so an attachment is filed as its message's link.
- Only top-level messages in the channel are filed; a reply in a thread is filed only when it addresses the agent.
- Titles and summaries come from what the message says; the agent does not open the links.
