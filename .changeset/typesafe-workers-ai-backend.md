---
'@dxos/plugin-typesafe': minor
---

plugin-typesafe gains a `backend` setting: `workers-ai` answers decisions with Cloudflare Workers AI's `typesafe/jev` through EDGE's `/ai/generate/workers-ai/typesafe` route instead of TypeSafe's API, with no vendor key sent. `EdgeAiService` in `@dxos/edge-client` accepts `'workers-ai/typesafe'`.
