---
'@dxos/plugin-discord': minor
---

An agent can attach files to what it posts in Discord: the `sendMessage` and `sendDirectMessage` operations take `files`, references to File objects held in blob storage (images, videos, documents up to 10 MB each), and `DiscordBot.Action` carries them to the bot as `Attachment`s keyed by their blob digest, so only the key crosses to the bot.
