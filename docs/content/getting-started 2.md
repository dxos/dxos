---
title: Getting Started
description: Setup a DXOS Client.
---

This guide will show you how to get started with `@dxos/client` and get your React Application up and running in seconds.

## Introduction

The `@dxos/client` is your entry point to save data and share it with other peers in your network.

### Prerequistes

This tutorial assumes you are familiar with ES6 and React. 
Before proceding, make sure your system matches the following requirements:

- Node.js v12+
- npm v6+ or yarn v1.20+ (We'll use `yarn` here)


## Installation

First, we need to install some DXOS packages:

```bash
yarn add @dxos/client@beta @dxos/random-access-multi-storage@beta
```

- `@dxos/client`: This is the client package.
- `@dxos/random-access-multi-storage`: This module is a helper to create a `random-access-storage` instance based on 
the current environment implementation (chrome, firefox, node, etc).


## Create a Client

We can now proceed to create our Client instance. We'll need to provide a `storage` for our data. 
The storage is a `random-access-storage` instance.

In `index.js` let's add the imports for `Client` and `createStorage`, and then create a Client. 
We should provide a storage instance into the Client constructor. 
The storage is a `random-access-storage`, we will use `createStorage` to create one for us. Finally, 
we need to initialize the client.

```js
import { Client } from '@dxos/client';
import { createStorage } from '@dxos/random-access-multi-storage';

const client = new Client({
  storage: createStorage('my-storage')
});

await client.initialize();
```

Ok, now we are ready to use our client.

// TODO: DO SOMETHING WITH THE CLIENT HERE?

## Connect your React Application

Once we have our client constructed we can connect our React Application using the `ClientProvider` 
from `@dxos/react-client` package. This provider is similar to React's Context.Provider.

Let's start by adding `@dxos/react-client` dependency to a React Application:

```bash
yarn add @dxos/react-client@beta
```

Now, let's edit the `index.js`. Add the imports and wrap our application with the `ClientProvider`.

```jsx
import React from 'react';
import ReactDOM from 'react-dom';

import { Client } from '@dxos/client';
import { createStorage } from '@dxos/random-access-multi-storage';
import { ClientProvider } from '@dxos/react-client';

const client = new Client({
  storage: createStorage('my-storage')
});

function App() {
  return (
    <ClientProvider client={client}>
      <div>
        <h2>My first DXOS app!</h2>
      </div>
    </ClientProvider>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
```

Notice here that we have created our `client` instance but we haven't called the `initialize` method. 
The `ClientProvider` will do it for you, so you don't need to struggle with async calls in your 
React Application's `index.js`.

