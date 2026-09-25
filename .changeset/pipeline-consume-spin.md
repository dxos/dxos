---
'@dxos/echo': patch
---

Fix an event-loop spin in the feed pipeline when its consumer raced `start()`: with enough feeds in a space, the client-services worker could wedge during boot — pegged CPU, no RPC responses — leaving the app on the fatal startup dialog.
