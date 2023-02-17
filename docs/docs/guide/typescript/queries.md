---
order: 5
title: Queries
---

# Queries

Once access is obtained to a [space](./spaces), objects can be retrieved:

```ts file=./snippets/read-items.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

const space = spaces[0];

// query items by selecting them
const selection = space.experimental.db.query({ /* ... */ });
```

## Typed Queries
It's possible to receive strongly typed results from a `query`.