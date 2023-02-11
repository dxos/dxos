---
title: Mutations
order: 5
---

Mutating objects in [ECHO](../platform/) is as simple as directly manipulating them like normal JavaScript objects.

When an object comes out of an [ECHO](../platform/) query, it is tracked by framework and any changes to it will be issued to the peer network and applied to all connected clients reactively. Other clients see their `useQuery` hooks and query subscriptions fire when the changes come in.

```tsx file=./snippets/mutations.tsx

```