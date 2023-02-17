---
order: 6
---

# Mutations

Objects returned from `query` are automatically tracked by the `Client` and direct manipulation of them will result in writes being dispatched over the network to listening peers in the space.

```ts file=./snippets/write-items.ts#L5-
import { Client, DocumentModel } from '@dxos/client';

const client = new Client();

// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

// create a regular DocumentModel item
const item = await spaces[0].database.createItem({
  type,
  model: DocumentModel
});

// set a property value
item.model.set('someKey', 'someValue');

// query items
const items = spaces[0].database.select({ type });
```

## Creating objects
To insert an object into an ECHO space, simply construct it and call the `save` method to begin tracking it.

### Untyped
Without strong types, the generic `Document` class can be used:
```tsx file=./snippets/create-objects.ts#L5-

```

### Typed
If strong types are desired, an instance of a specific `Document` descendant should be used:
```tsx file=./snippets/create-objects-typed.ts#L5-

```

## Deleting objects