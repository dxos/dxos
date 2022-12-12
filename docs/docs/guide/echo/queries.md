---
order: 5
label: Queries
---

# Querying data

Once access is obtained to a space, select items to retrieve them.

```ts file=./snippets/read-items.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

// query items by selecting them
const selection = spaces[0].database.select({ type });
```

### Filtering data
```ts file=./snippets/read-items-selections.ts#L10-
```