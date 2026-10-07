---
'@dxos/plugin-agent': minor
---

`BrainService` splits into a knowledge base and an event base: `push` stores facts and queues an event in the outbox of every subscription they match, `query` reads facts back, and consumers drain each subscription with `take` and `ack` (`subscribe`, `subscriptions` and `unsubscribe` manage them). This replaces `addFacts`, `queryFacts`, `putTrigger`, `listTriggers` and `removeTrigger`. Fact matching moves to `Trigger.matchesPattern`, and `BrainService.matchEvent` lets a remote brain match the same way. Opening an agent's page directly no longer fails to open the private chat the first time.
