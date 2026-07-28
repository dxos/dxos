---
'@dxos/echo': minor
'@dxos/plugin-assistant': minor
---

Agents become identity/presets (breaking, no data migration — 0.1.0 agents must be recreated): `Agent` 0.2.0 keeps only name, DID, enabled, and a typed `Instructions` ref; chats reference their agent via `Chat.agent`; durable artifacts belong to a Project collection; subscriptions and cron schedules compile to Routines whose relay qualifies events with a cheap model and forwards them onto the durable agent session.
