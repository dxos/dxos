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

const space = spaces[0];

// query items by selecting them
const selection = space.database.select({ type });
```

### Filtering data

```ts file=./snippets/read-items-selections.ts#L17-
// filter selections by chaining
const selection = space.database
  .select({ type })
  .filter((item) => !item.deleted);
```

### Selecting children

```ts file=./snippets/read-items-selections-children.ts#L17-
// filter selections by chaining
const selection = space.database
  .select({ type })
  .children()
  .filter((item) => !item.deleted);
```
