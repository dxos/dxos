# An Introduction to DXOS

## Overview

- TODO(burdon): Create minimal app (and tests) with these snippets.

## Client

The `Client` class is the main API through which applications access and share data.

- TODO(burdon): Essential config properties.

```tsx
import { Client } from '@dxos/client';

const client = new Client({
  ...
});
```

The `ClientProvider` container constructs the `Client` object and makes it available to ancestor components via the `useClient` hook, which uses a shared context.

```tsx
import { ClientProvider } from '@dxos/react-client';

export const App = () => {
  const client = useClient();

  return (
    <div>Config={JSON.stringify(client.config)}</div>
  );
};

ReactDOM.render(
  <ClientProvider config={{ ... }}>
    <App />
  </ClientProvider>,
  document.getElementById('root')
);
```

## Profile

```tsx
import { useClient, useProfile } from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  const profile = useProfile();

  useEffect(() => {
    void client.halo.createProfile({ username: 'Alice' });
  }, []);
  
  if (!profile) {
    return null;
  }

  return (
    <div>Hello {profile.username}</div>
  );
};
```

## Parties

```tsx
import { Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useMemo<Party>();
  const [party, setParty] = useMemo<Party>();

  useEffect(() => {
    void (async () => {
      const party = await client.echo.createParty({ title: 'New Party' });
      setParty(party);
    })();
  }, []);
  
  if (!party) {
    return null;
  }

  return (
    <div>Party: {party.key.toHex()}</div>
  );
};
```

## Queries

```tsx
import { useParty, useSelection } from '@dxos/react-client';

export const List = ({ key }) => {
  const party = useParty(key);
  const items = useSelection(party.select({ type: 'task' }));

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.model.get('name')}</li>
      ))}
    </ul>
  );
};
```

## Mutations

```tsx
import { useParty } from '@dxos/react-client';

export const List = ({ key }) => {
  const party = useParty(key);
  const textRef = useRef();

  const handleCreate = async () => {
    party.database.createItem({
      type: 'task',
      properties: {
        title: textRef.current.value
      }
    });
  };

  return (
    <div>
      <input ref={textRef} type='text' />
      <button onClick={handleCreate}>New Task</button>
    </div>
  );
};
```

## Sharing

```tsx
const invitation = await party.createInvitation();
```
