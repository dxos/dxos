---
position: 3
label: Spaces
---
# Spaces 

```tsx
import { Party } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  const [party_key, setPartyKey] = useMemo<Party>();
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

```tsx
const invitation = await party.createInvitation();
```
