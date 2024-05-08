---
title: Mutations
order: 4
---

Mutating objects in [ECHO](../echo.md) is as simple as directly manipulating them like normal JavaScript objects.

When an object comes out of an [ECHO](../echo.md) query, it is tracked by framework and any changes to it will be issued to the peer network and applied to all connected clients reactively. Other clients see their `useQuery` hooks and query subscriptions fire when the changes come in.

## Untyped Mutations

### Setting values

In the example below, clicking a task sets `completed = true`.

```tsx{17,26,27} file=./snippets/mutations.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { Expando, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space, { type: 'task' });
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            task.completed = true;
          }}
        >
          {task.title} - {task.completed}
        </div>
      ))}
      <button
        name="add"
        onClick={() => {
          const task = new Expando({ title: 'buy milk' });
          space?.db.add(task);
        }}
      >
        Add a task
      </button>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

### Creating objects

To create (insert) a new object, simply construct a `new Expando` and pass any initial values into the constructor.

::: note Tip
Calling `space.db.add(task)` needs to happen only once. All changes to the object afterwards will be tracked by ECHO.
:::

## Typed Mutations

The following example uses the same [schema](./queries.md#typed-queries) definition and code generation setup with `dxtype` as in the [Typed Queries](./queries.md#typed-queries) section.

### Setting values

In the example below, clicking a task sets `completed = true` in the same way as the untyped API.

```tsx{19,28} file=./snippets/mutations-typed.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { Task, types } from './schema';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery<Task>(space, Task.filter());
  return (
    <>
      {tasks.map((task) => (
        <div
          key={task.id}
          onClick={() => {
            task.completed = true;
          }}
        >
          {task.title} - {task.completed}
        </div>
      ))}
      <button
        name='add'
        onClick={() => {
          const task = new Task({ title: 'buy milk' });
          space?.db.add(task);
        }}
      >
        Add a task
      </button>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider
    onInitialized={async (client) => {
      client.addSchema(types);
    }}
  >
    <App />
  </ClientProvider>,
);
```

### Creating objects

To create (insert) a new object, simply construct a `new` one with the appropriate constructor like `Task` and pass any initial values into the constructor.

## Removing objects

To remove an object (typed or untyped) call the `remove` API on a space.

```ts
await space.db.remove(task);
```

::: note
Objects in ECHO are not physically deleted, they are marked with a removed field and remain in the change history until the next [epoch](../glossary.md#epoch). This ECHO mutation feed design is required to allow any latent offline writers to reconcile changes when they come online.
:::
