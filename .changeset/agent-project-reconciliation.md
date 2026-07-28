---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Agents become identity/presets (breaking, with migration): `Agent` 0.2.0 keeps only name, DID, enabled, and a typed `Instructions` ref; chats reference their agent via `Chat.agent`; inline agent artifacts migrate to a Project collection; subscriptions and cron schedules compile to Routines whose relay qualifies events with a cheap model and forwards them onto the durable agent session.
