---
'@dxos/plugin-markdown': minor
---

Connectors can declare `envBinding`, naming the environment variable that holds their API key. During local development the dev server exposes the allowlisted keys and plugin-connector provisions the `AccessToken` and `Connection` on startup, so a connection survives a profile reset without the key being pasted into the dialog again. HeyGen and Ideogram declare bindings.
