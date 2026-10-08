---
'@dxos/echo-protocol': patch
---

Fix feed queries and queue indexing failing with `RangeError: Bad value` in long-running Safari 18 (WebKit) workers once 2 GiB of feed blocks had been decoded. `EchoFeedCodec` now decodes through a `TextDecoder` it replaces before WebKit's per-instance byte cap, built with the new `makeBoundedTextDecoder` from `@dxos/util`.
