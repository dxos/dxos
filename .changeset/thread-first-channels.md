---
'@dxos/plugin-markdown': minor
---

Channels are now thread-first. The main view lists root messages only, each showing the thread branching from it (name, reply count, last activity) or an affordance to start one; opening a thread renders its replies in a panel beside the channel, where the composer posts back into that thread. Messages gain emoji reactions — folded per emoji with counts and an own-state highlight, and stored as per-author feed items so an offline retry cannot double-count — plus author-only edit and delete. Deleting is now restricted to your own messages, where any participant could previously delete anyone's. A thread's name is stored as a field of a typed `org.dxos.chat.thread` annotation rather than a key in the untyped `properties` bag.
