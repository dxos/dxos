---
order: 1
---

# Mutations

Objects returned from `query` are automatically tracked by the `Client` and direct manipulation of them will result in writes being dispatched over the network to listening peers in the space.

```ts file=./snippets/write-items.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // get a list of all spaces
  const spaces = client.spaces.get();
  // grab a space
  const space = spaces[0];
  // grab an object
  const result = await space.db.query({ type: 'task' }).run();
  const object = result.objects[0];
  // mutate the object directly
  object.isCompleted = true;
})();
```

The mutation will queue up inside the `Client` and begin propagating to listening peers on the next tick.

## Creating objects

To insert an object into an ECHO space, simply construct it and call the `add` method to begin tracking it.

### Untyped

Without strong types, the generic `Expando` class can be used:

```tsx file=./snippets/create-objects.ts#L5-
import { Client } from '@dxos/client';
import { Expando } from '@dxos/client/echo';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();

  const space = client.spaces.get()[0];

  const object = create(Expando, { type: 'task', title: 'buy milk' });

  await space.db.add(object);
})();
```

### Typed

If strong types are desired, an instance of a specific `TypedObject` descendant should be used:

```tsx file=./snippets/create-objects-typed.ts#L5-
import { Client } from '@dxos/client';

import { Task, types } from './schema';

const client = new Client();

void (async () => {
  await client.initialize();
  client.addSchema(types);
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = client.spaces.get()[0];

  const object = new Task({ title: 'buy milk' });

  space.db.add(object);
})();
```

## Removing objects

To remove an object (typed or untyped) call the `remove` API on a space.

```ts
await space.db.remove(object);
```

::: note
Objects in ECHO are not physically deleted, they are marked with a removed field and remain in the change history until the next [epoch](../../glossary.md#epoch). This ECHO mutation feed design is required to allow any latent offline writers to reconcile changes when they come online.
:::
