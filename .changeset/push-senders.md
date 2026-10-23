---
'@dxos/edge-client': minor
'@dxos/plugin-messenger': minor
---

Push notifications now come only from contacts: plugin-messenger uploads the members of the spaces you share to EDGE with the new `EdgeHttpClient.putPushSenders`, and EDGE skips the push for anyone else while still delivering the notice to the inbox.
