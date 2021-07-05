---
title: Creating a Party
description: Add a Space for Sharing Data.
---

A Party is ...

## Create a Party

A Party is identified by a `publicKey`. We can create multiple parties. In this example we use the Parties to create a List that we'll share and invite other peers to read and collaborate later on.

In `containers/Main.js` we added a handler to create a list, which will create the party: 

```js
export default function Main () {
  const client = useClient();
  // ...
  const [selected, setSelected] = useState();

  // ...
  
  const handleCreateList = async () => {
    const party = await client.createParty();
    setSelected(party.publicKey.toString('hex'));
  }

```

The `handleCreateList` creates a new `Party` using the `client` and then sets the `selected` to a *hex* value of the party's publicKey.

## Retrieve a Party

Once we have a party created, we can retrieve it using its `publicKey` with the `useParty` hook. This is showcased in the Tasks Component (`containers/Tasks.js`). We will get back to this in the [DATA CHAPTER LINK HERE]

```js
export default function Tasks({ partyKey }) {
  const party = useParty(partyKey);

  // ...
}  
```
