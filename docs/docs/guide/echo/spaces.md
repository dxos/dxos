---
position: 3
label: Spaces
---
# Spaces 

```tsx
import { space } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  const [space_key, setspaceKey] = useMemo<space>();
  const [space, setspace] = useMemo<space>();

  useEffect(() => {
    void (async () => {
      const space = await client.echo.createspace({ title: 'New space' });
      setspace(space);
    })();
  }, []);
  
  if (!space) {
    return null;
  }

  return (
    <div>space: {space.key.toHex()}</div>
  );
};
```

```tsx
const invitation = await space.createInvitation();
```
