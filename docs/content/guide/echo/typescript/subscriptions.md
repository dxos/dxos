---
order: 3
---

# Subscriptions

Use subscriptions to listen for changes within a [space](./README.md).

## Subscribe to a query

For example:
```ts{12,14} file=./snippets/subscription.ts#L5-
import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';

const client = new Client();

async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();

  const space = await client.spaces.create();

  const query = space.db.query({ type: 'task' });

  const unsubscribeFn = query.subscribe(({ objects }) => {
    objects.forEach(object => {
      if (object.type === 'task') {
        console.log('Do something with this task');
      } else {
        throw new Error('Non-task object returned (this will never happen)');
      }
    });
  });

  try {
    const taskObject = create(Expando, { type: 'task', title: 'buy milk' });
    space.db.add(taskObject);
    const eventObject = create(Expando, { type: 'event', title: 'arrived at store' });
    space.db.add(eventObject);
  } finally {
    unsubscribeFn();
  }
};
```

## Do something when an object changes

Objects returned by ECHO queries are [ReactiveObject](../../../api/@dxos/client/types/ReactiveObject.md)s, which are a kind of [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) object that will trigger reactivity and subscriptions like a Preact signal. Unlike signals, the values are read and modified directly rather than through `.value`.

```ts{22} file=./snippets/on-object-change.ts#L5-
import { Client } from '@dxos/client';
import { Expando, create } from '@dxos/client/echo';
import { effect } from '@preact/signals-core';
import { registerSignalRuntime } from '@dxos/echo-signals';

registerSignalRuntime();

const client = new Client();
Yeah
async () => {
  await client.initialize();

  if (!client.halo.identity.get()) await client.halo.createIdentity();

  const space = await client.spaces.create();

  const object = create(Expando, { type: 'task', title: "buy milk" });
  space.db.add(object);

  let titles: string[] = []

  const unsubscribeFn = effect(() => {
    titles.push(object.title);
  })

  object.title = "buy cookies"

  if (titles.join() === ["buy milk", "buy cookies"].join()) {
    console.log("Success.");
  } else {
    console.log("This will never happen.");
  }

  unsubscribeFn();
}
```
