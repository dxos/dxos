---
order: 6
---

# Mutations

Objects returned from `query` are automatically tracked by the `Client` and direct manipulation of them will result in writes being dispatched over the network to listening peers in the space.

```ts file=./snippets/write-items.ts#L5-
import { Client, DocumentModel } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile()
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
  // grab a space
  const space = spaces[0];
  // grab an object
  const result = space.experimental.db.query({ type: 'task' });
  const object = result.objects[0];
  // mutate the object directly
  object.isCompleted = true;
})()
```

The mutation will queue up inside the `Client` and begin propagating to listening peers on the next tick.

## Creating objects

To insert an object into an ECHO space, simply construct it and call the `add` method to begin tracking it.

### Untyped

Without strong types, the generic `Document` class can be used:

```tsx file=./snippets/create-objects.ts#L5-
import { Client, Document } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();

  const { value: spaces } = client.echo.querySpaces();
  const space = spaces[0];

  const object = new Document({ type: 'task', title: 'buy milk' });

  await space.experimental.db.add(object);
})();
```

### Typed

If strong types are desired, an instance of a specific `Document` descendant should be used:

```tsx file=./snippets/create-objects-typed.ts#L5-
import { Client } from '@dxos/client';
import { Task } from './schema';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();

  const { value: spaces } = client.echo.querySpaces();
  const space = spaces[0];

  const object = new Task({ title: 'buy milk' });

  await space.experimental.db.add(object);
})();
```

## Deleting objects

To delete an object (typed or untyped) call the `delete` API on a space.

```ts
await space.experimental.db.delete(object);
```

::: note
Objects in ECHO are not physically deleted, they are marked with a deleted field and remain in the change history until the next [epoch](../glossary#epoch). This ECHO mutation feed design is required to allow any latent offline writers to reconcile changes when they come online.
:::
