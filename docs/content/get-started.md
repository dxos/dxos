---
title: Get Started
---

This short tutorial gets you up and running with the DXOS Client.

### Prerequisites

This tutorial assumes you are familiar with ES6, Node, and React.
Before proceeding, make sure your system meets the following requirements:

- Node.js v12+
- npm v6+ or yarn v1.20+ (We'll use `yarn` here.)

## 1: Setup

We will be using [Create React App](https://reactjs.org/docs/create-a-new-react-app.html) to start the new application.

```bash
npx create-react-app dxos-tutorial
cd dxos-tutorial
yarn start
```

You should now see your app running on [http://localhost:3000](http://localhost:3000) with React logo.

## 2: Install DXOS Dependencies

Let's start by installing the required dependencies from the DXOS Stack:

```bash
yarn add @dxos/react-client @dxos/object-model
```

Applications depend on the following libraries.

| Syntax               | Description       |
| -------------------- | ----------------- |
| `@dxos/react-client` | Main API          |
| `@dxos/object-model` | ECHO Object model |

## 3: Create a DXOS Client

```jsx:title=index.js
import { Client } from '@dxos/client';

const client = new Client({
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' },
});

await client.initialize();
```

- `swarm.signal`: Signaling server URL. Used to establish WebRTC connections with other peers.

That's it! Our client is ready to start interacting with DXOS. Now let's connect our client to our React app.

## 4: Connect your client to React

You connect DXOS Client to React with the `ClientInitializer` component. Similar to React's [Context.Provider](), `ClientInitializer` not only wraps your React app and places DXOS Client on the context, which enables you to access it from anywhere in your component tree but also creates the instance for you. So we can simplify the step above as follows.

```jsx:title=index.js
import React from 'react';
import { render } from 'react-dom';
import { ClientInitializer } from '@dxos/react-client';

const config = {
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' },
};

const App = () => {
  return (
    <div>
      <h1>Hello from DXOS</h1>
    </div>
  );
};

render(
  <ClientInitializer config={config}>
    <App />
  </ClientInitializer>,
  document.getElementById('root')
);
```

## 5: Create a Party

After your `ClientInitializer` is hooked up, you can create your first `Party`. You can do so by interacting with the [`ECHO`]() object, responsible for storing information in DXOS.

Still in index.js, let's create a component `PartyCreator` that creates a new party with a given title:

```jsx:title=index.js
const PartyCreator = () => {
  const client = useClient();

  const [createdParty, setCreatedParty] = useState();

  useEffect(() => {
    (async () => {
      const party = await client.echo.createParty();
      await party.setProperty('title', 'My first DXOS Party 🚀');
    })();
  }, []);

  return (
    <div>
      <h1>{createdParty.getProperty('title')}</h1>
    </div>
  );
};
```

Finally, we'll add `PartyCreator` to our existing component tree:

```jsx:title=index.js
const App = () => {
  return (
    <div>
      <PartyCreator />
    </div>
  );
};
```

Congrats, you just made your first component that creates a Party through your own DXOS Client! 🎉 Now you can try building more components that use the Party to explore the concepts we have just learned.

## Next steps

Now that you've learned how to create a party with DXOS Client, you're ready to dive deeper into creating queries, mutations and inviting peers to join your party. After this section, we recommend moving on to:

- [Tutorial](./tutorial/introduction): Learn how to build a real-world application with our guided tutorial that will walk you through all the concepts of DXOS.

- [Queries](./core-concepts/queries): Learn how to fetch queries with arguments and dive deeper into configuration options. For a full list of options, check out the API reference for `useSelection`.

- [Mutations](./core-concepts/mutations): Learn how to update data with mutations and when you'll need to update the Apollo cache. For a full list of options, check out the API reference for `createItem`.

- [DXOS Client API](./api-reference/dxos-client): Sometimes, you'll need to access the client directly like we did in our plain JavaScript example above. Visit the API reference for a full list of options.
