---
'@dxos/app-toolkit': minor
'@dxos/plugin-review': minor
'@dxos/types': minor
---

Commenting on an object subscribes you to its comments, and each new comment reaches the other subscribers' messenger inbox. A bell in the Comments companion turns this off or back on for that object. Subscribers are stored on the object in the new `Subscription` annotation, read and written through the `Subscription` helpers in `@dxos/types`. Sending goes through `AppCapabilities.InboxSender` in `@dxos/app-toolkit`, which plugin-messenger contributes, so a plugin can notify people without depending on the messenger.
