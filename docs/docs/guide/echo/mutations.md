---
order: 6
title: Mutations
---

# Mutating data

```ts file=./snippets/write-items.ts
//
// Copyright 2022 DXOS.org
//

import { Client, ObjectModel } from '@dxos/client';

const client = new Client();

// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

// create a regular ObjectModel item
const item = await spaces[0].database.createItem({
  type,
  model: ObjectModel
});

// set a property value
item.model.set('someKey', 'someValue');

// query items
const items = spaces[0].database.select({ type });
```
