
# Obtaining a user identity

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
