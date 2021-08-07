---
title: Parties
---

A Party is the DXOS element responsible for sharing content among the invited members. Each Party is identified by a `publicKey`.

## Create a Party

Party creation is handled through the `client.echo` object:

```jsx
import { useClient } from '@dxos/react-client';

const Component = () => {
  const client = useClient();

  const handleSubmit = async (title) => {
    const party = await client.echo.createParty();

    // TODO: shouldn't the title be set on createParty?
    await party.setProperty('title', title);

    console.log(party.key);
  };
};
```

After creating the party, we need to set the title property through the `setProperty` function.

## Fetch a single Party

To be able to access a specific Party, you should use the `useParty` hook from `@dxos/react-client`:

```jsx
import { useParty } from '@dxos/react-client';

const Component = ({ partyKey }) => {
  const party = useParty(partyKey);

  // ...
};
```

> This hook requires you to wrap your app with `ClientInitializer`. See [Create a Client](./client#create-a-client) for more details.

## Fetch all the Parties

To be able to retrieve all the Parties where the current user is in, you should use the `useParties` hook from `@dxos/react-client`:

```jsx
import { useParties } from '@dxos/react-client';

const Component = () => {
  const party = useParties();

  // ...
};
```

> This hook requires you to wrap your app with `ClientInitializer`. See [Create a Client](./client#create-a-client) for more details.
