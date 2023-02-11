---
title: Mutations
order: 5
---

Mutating objects in [ECHO](../platform/) is as simple as directly manipulating them like normal JavaScript objects.

When an object comes out of an [ECHO](../platform/) query, it is tracked by framework and any changes to it will be issued to the peer network and applied to all connected clients reactively. Other clients see their `useQuery` hooks and query subscriptions fire when the changes come in.

## Untyped Mutations

### Setting values

In the example below, clicking a task sets `completed = true` on line 20.

```tsx{19,23,24} file=./snippets/mutations.tsx#L5-
```
### Creating objects

To create (insert) a new object, simply construct a `new Document` and pass any initial values into the constructor (line 23 above).

::: note Tip
Calling `space.experimental.db.save(task)` (line 25) needs to happen only once. All changes to the object afterwards will be tracked by ECHO.
:::

## Typed Mutations

### Setting values

In the example below, clicking a task sets `completed = true` on line 20.

```tsx{20,24,25} file=./snippets/mutations-typed.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useOrCreateFirstSpace,
  useIdentity,
  useQuery,
  id,
} from '@dxos/react-client';

import { Task } from './schema';

export const App = () => {
  useIdentity({ login: true });
  const space = useOrCreateFirstSpace();
  const tasks = useQuery<Task>(space, Task.filter());
  return <>
    {tasks?.map((item) => (
      <div key={item[id]} onClick={() => {
        item.completed = true;
      }}>{item.title} - {item.completed}</div>
    ))}
    <button name="add" onClick={() => {
      const task = new Task({ title: 'buy milk' });
      space.experimental.db.save(task);
    }}>Add a task</button>
  </>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```
### Creating objects

To create (insert) a new object, simply construct a `new` one with the appropriate constructor like `Task` and pass any initial values into the constructor (line 24 above).