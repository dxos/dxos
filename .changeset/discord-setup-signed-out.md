---
'@dxos/plugin-discord': patch
---

The Discord setup panel no longer reports "Discord setup failed — HTTP code 403: ." before you sign in. Signed out, the Servers section explains what signing in gives and offers a **Sign in to Discord** button; when EDGE refuses the caller (401/403) it says so beside the servers instead of raising an error, and real failures show a readable message with the raw reason beneath it. EDGE bot requests now fail with typed errors (`DiscordBotAccessError` for refusals, `DiscordChannelError` otherwise) whose messages are readable, which the agent Activity panel shows too.
