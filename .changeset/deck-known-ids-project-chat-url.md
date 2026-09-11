---
'@dxos/plugin-deck': patch
'@dxos/plugin-projects': patch
---

- plugin-deck: an in-app navigation opens a plank under the node id it already holds, so the projection no longer mounts a placeholder plank and then re-keys it — which remounted the plank and its companion on every document switch.
- plugin-projects: a project's chats carry a `chat` URL binding, so opening one from the Chats branch no longer fails with "node has no URL binding".
