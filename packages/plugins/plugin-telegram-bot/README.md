# @dxos/plugin-telegram-bot

Telegram **Bot API** integration for Composer Agent.

The DXOS agent acts *as a bot* — sending and receiving messages through a Telegram bot you create with [@BotFather](https://t.me/BotFather). Good for letting the agent post notifications into a group chat, or act as a conversational interface for your team over a DM.

## ⚠️ Not what you want for a personal inbox

This plugin **cannot** read your personal DMs or the conversations you have with other humans on Telegram. Telegram's Bot API only surfaces messages sent *to the bot itself*.

To sync your personal Telegram account (every DM, every group you're in, everything you'd see when you open the Telegram app), use **[@dxos/plugin-telegram-user](../plugin-telegram-user)** instead, which uses the MTProto user protocol.

| | `plugin-telegram-bot` (this plugin) | `plugin-telegram-user` |
|---|---|---|
| Protocol | Bot API (REST) | MTProto (user protocol) |
| Identity | A bot you create | Your personal account |
| Can read | Messages sent *to the bot* | Every chat you're in |
| Auth | Bot token from @BotFather | Phone + SMS code + 2FA |
| Setup complexity | Paste a token | Multi-step login flow |
| Use case | Agent-as-bot, notifications, team commands | Unified inbox, personal sync |

The two plugins are independent and can be installed together.

## Setup

1. Message [@BotFather](https://t.me/BotFather) in Telegram, run `/newbot`, follow the prompts, save the bot token (`123456:ABC-DEF...`).
2. In Composer: Settings → Telegram Bot → paste the token → **Test Connection**.
3. Send a message to the bot from any Telegram account — the chat will be discovered and appear in the monitored-chats list. Toggle any you want the agent to watch.
4. Open the Telegram Bot panel (deck companion) to see the message feed.

## Scopes / permissions

No OAuth. The bot token implicitly grants everything the bot can do. In groups, bots by default have **privacy mode** enabled, meaning they only see messages that @-mention them or reply to one of their messages. Turn off privacy mode via `/setprivacy` with @BotFather if you want the bot to see all group messages.

## Related

- **[@dxos/plugin-telegram-user](../plugin-telegram-user)** — syncs your personal Telegram account.
- **[@dxos/plugin-slack](../plugin-slack)** — same pattern for Slack (bot tokens).
