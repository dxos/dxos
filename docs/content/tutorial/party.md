---
title: 3. Create a Party
description: Add a Space for Sharing Data
---

A Party is a DXOS component responsible for sharing content between invited clients. Each Party is identified by a `publicKey`.

## Create a Party

In this example we use the Parties to create a Task List that we'll share and invite other peers to read and collaborate later on.

Pay attention to the `PartySettings.js` component rendered by `PartyList.js`. It contains the logic to create new parties.

Party creation is handled through the `Echo` object that is contained by the Client instance. After creating the party it's required to set the title property through the `setProperty` function.

```js
const PartySettings = ({ partyKey, onClose }) => {
  const client = useClient();

  const [title, setTitle] = useState('');

  const handleUpdate = async () => {
    const party = await client.echo.createParty();

    await party.setProperty('title', title);

    partyKey = party.key;

    onClose({ partyKey });
  };

  // ...
};
```

## Retrieve a single Party

Once we have a party created, we can retrieve it using its public key (`partyKey`) with the `useParty` hook. This is showcased in the `TaskList.js` component.

```js
import { useParty } from '@dxos/react-client';

const TaskList = ({ partyKey }) => {
  const party = useParty(partyKey);

  // ...
};
```

## Retrieve all the Parties

We can also retrieve all the Parties created under the same `Echo` object contained by the Client instance. You can watch this on the `PartyList.js` component.

```js
import { useParties } from '@dxos/react-client';

const PartyList = ({ partyKey }) => {
  const parties = useParties();

  // ...
};
```
