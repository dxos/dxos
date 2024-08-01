---
order: 3
---

# Subscriptions

Use subscriptions to listen for changes to objects in a [space](./README.md).

## Subscribe to a query

Use the [`subscribe`](/api/@dxos/client/classes/Query#subscribe-callback-opts) method on a query to listen for changes to objects in a space. The callback will be called with an object containing the new objects that match the query. The return value of `subscribe` is a function that can be called to stop the subscription.

```ts{12,14} file=./snippets/subscription.ts#L5-
import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';

const client = new Client();

async () => {
  await client.initialize();
  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = await client.spaces.create();

  const query = space.db.query({ type: 'task' });

  const unsubscribeFn = query.subscribe(({ objects }) => {
    objects.forEach((object) => {
      if (object.type === 'task') {
        console.log('Do something with this task');
      }
    });
  });

  try {
    const taskObject = create(Expando, { type: 'task', title: 'buy milk' });
    space.db.add(taskObject);
    const eventObject = create(Expando, {
      type: 'event',
      title: 'arrived at store',
    });
    space.db.add(eventObject);
  } finally {
    unsubscribeFn();
  }
};
```

## Subscribe to an object

Objects returned from ECHO queries are based on [ReactiveObject](/api/@dxos/client/types/ReactiveObject.md), which are a kind of [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object that will trigger reactivity and subscriptions like a Preact signal. Unlike signals, the values are read and modified directly rather than through `.value`.

You can use the `effect` closure from `@preact/signals-core` to re-run code whenever the object changes. Any properties of ECHO objects accessed inside `effect` closures will be tracked and re-run the closure when they change.

```ts{22} file=./snippets/on-object-change.ts#L5-
import { effect } from '@preact/signals-core';

import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';
import { registerSignalRuntime } from '@dxos/echo-signals';

registerSignalRuntime();

const client = new Client();

async () => {
  await client.initialize();

  if (!client.halo.identity.get()) {
    await client.halo.createIdentity();
  }

  const space = await client.spaces.create();

  const object = create(Expando, { type: 'task', name: 'buy milk' });
  space.db.add(object);

  const names: string[] = [];

  const unsubscribeFn = effect(() => {
    names.push(object.title);
  });

  object.name = 'buy cookies';

  if (names.join() === ['buy milk', 'buy cookies'].join()) {
    console.log('Success.');
  } else {
    console.log('This will never happen.');
  }

  unsubscribeFn();
};
```
