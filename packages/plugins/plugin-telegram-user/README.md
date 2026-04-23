# @dxos/plugin-telegram-user

Personal Telegram **account** sync for Composer Agent.

Logs into Telegram as *you* (via the MTProto user protocol, the same one official Telegram clients use) and builds a **unified inbox** of every DM, group, and channel you're in — so the agent can react to all incoming messages across your whole Telegram life, not just one bot.

## ⚠️ Not what you want for agent-as-a-bot

This plugin is your *personal* Telegram account. It cannot easily post as a neutral third-party identity, because any message it sends appears as coming from *you*.

To let the agent send and receive messages *as a dedicated bot* (e.g. a notification bot in a team chat), use **[@dxos/plugin-telegram-bot](../plugin-telegram-bot)** instead.

| | `plugin-telegram-user` (this plugin) | `plugin-telegram-bot` |
|---|---|---|
| Protocol | MTProto (user protocol) | Bot API (REST) |
| Identity | Your personal account | A bot you create |
| Can read | Every chat you're in | Messages sent *to the bot* |
| Auth | Phone + SMS code + 2FA | Bot token from @BotFather |
| Setup complexity | Multi-step login flow | Paste a token |
| Use case | Unified inbox, personal sync | Agent-as-bot, notifications, team commands |

The two plugins are independent and can be installed together.

## Setup

1. Register an app at <https://my.telegram.org/apps> — you'll need the `api_id` (integer) and `api_hash` (hex string). One-time per account.
2. In Composer: Settings → Telegram → paste the `api_id`, `api_hash`, and your phone number (with country code). Click **Connect**.
3. Enter the SMS / Telegram code Telegram sends to your account.
4. If you have 2FA enabled, enter your cloud password.
5. Done — the session is saved locally. Subsequent reloads auto-reconnect. Open the Telegram panel (deck companion) to see your unified inbox.

## Security notes

- The **session string** produced after login is equivalent to your Telegram login. Anyone who obtains it can act as you in Telegram. It's currently stored in localStorage under the plugin's settings key; migration to an encrypted `AccessToken` in the space is tracked in `plans/adopt-access-token-for-sync-plugins.md`.
- The `api_hash` is *not* secret per Telegram's own guidance, but treat it like a secret anyway — if a bad actor has both your `api_hash` and a valid SMS code, they can log in as you.

## Limitations (for now)

- Messages live **in memory** only — refresh loses scroll state but not the session. Persistence to ECHO is future work.
- Media (photos / files / stickers) is rendered as `[media]` for now; text only.
- No outgoing messages from the plugin yet. (Use the Telegram app directly or plugin-telegram-bot.)
- Bundle cost: gramjs is ~500 KB. It's lazy-loaded so you only pay if you enable the plugin.

## Related

- **[@dxos/plugin-telegram-bot](../plugin-telegram-bot)** — Telegram bot integration for agent-as-a-bot use cases.
- **[@dxos/plugin-inbox](../plugin-inbox)** — similar unified-inbox pattern for Gmail.
