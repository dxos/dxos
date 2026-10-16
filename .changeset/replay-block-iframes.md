---
'@dxos/observability': patch
---

Session replay no longer keeps removed DOM alive. An element whose direct child is an iframe is left out of recordings, since the recorder never releases a cross-origin iframe removed along with an ancestor, and that iframe kept the whole removed tree in memory. `<body>` is always recorded, and an iframe given the `ObservabilityExtension.PostHog.REPLAY_IFRAME_CLASS` class is recorded with its content.
