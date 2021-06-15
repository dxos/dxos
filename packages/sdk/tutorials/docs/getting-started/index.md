# Getting Started

- TODO(burdon): Model on https://www.apollographql.com/docs/react/get-started
- TODO(burdon): How do we test and keep the docs up-to-date (inject from runnable template?)
- TODO(burdon): Use material in these tutorials?

## Installation

First create a new react package using the standard [React scripts](https://create-react-app.dev/docs/getting-started) 
and install the required DXOS dependencies.

```bash
npx create-react-app hello-dxos
cd hello-dxos

yarn add @dxos/client @dxos/react-client
```

Next, start the React development server.

```bash
yarn start
```

## Create a client

At the heart of all DXOS application is the `@dxos/Client` class.
This is a highly-configurable object that controls all aspects of the system, 
but for many parameters there are default values.

The example below create a new `Client` setting the URL of the signal server used to establish peer-to-peer connections.

```javascript
import { Client } from '@dxos/client';

const client = new Client({
  swarm: {
    signal: 'wss://apollo1.kube.moon.dxos.network/dxos/signal'
  }
});
```

Edit the `src/App.js` file created by the `create-react-app` tool and add in the code below.

```javascript
// App.js
import { useEffect, useState } from 'react';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import Root from './Root';

function App() {
  const [client, setClient] = useState(null);

  // Asynchronously create the client.
  useEffect(() => {
    setImmediate(async () => {
      // Create the client.
      const client = new Client({
        storageType: 'persistent',
        swarm: {
          signal: 'wss://apollo1.kube.moon.dxos.network/dxos/signal'
        }
      });

      await client.initialize();
      setClient(client);
    });
  }, []);

  if (!client) {
    return null;
  }

  return (
    <ClientProvider client={client}>
      <Root />
    </ClientProvider>
  );
};
```

The code above asynchronously creates the client object when the application is first displayed.
The `ClientProvider` component implements a React [Conetxt Provider](https://reactjs.org/docs/context.html#contextprovider)
that enables child components to access the client object via the `useClient` hook.

For example the component below obtains the client object and display the configuration object.

```javascript
// Root.js
import { useClient } from '@dxos/react-client';

const Root = () => {
  const client = useClient();

  return (
    <div>
      <h1>Client Configuration</h1>
      <pre>{JSON.stringify(client.config, undefined, 2)}</pre>
    </div>
  );
};
```

Once the application is loaded it should immediately check if a user profile has been created
and if not allow the user to create one.

In the code below the `useProfile` hooks is used to access the user profile if it exists.
If not, a dialog is displayed.

```javascript
// Root.js
import { createKeyPair } from '@dxos/crypto';
import { useClient, useProfile } from '@dxos/react-client';

const Root = () => {
  const client = useClient();
  const profile = useProfile();
  const [username, setUsername] = useState('');

  if (!profile) {
    const handleCreateProfile = async () => {
      const { publicKey, secretKey } = createKeyPair();
      await client.createProfile({ publicKey, secretKey, username });
    };

    return (
      <div>
        <h2>Create Profile</h2>
        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={event => setUsername(event.target.value)}
        />
        <button onClick={handleCreateProfile}>Submit</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome {profile.username}!</h2>
    </div>
  );
};
```

## TODO

- List and create parties.
- List and create items.
- Invitations.
