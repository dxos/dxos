# Ephemeral Space

This gives developers a default place to store ephemeral runtime state with API consistency across the rest of ECHO.

# Requirements

1. Ephemeral spaces can be created without an identity
2. The contents of an ephemeral space replicate to all windows of the same identity by default
3. Developers can create as many of these ephemeral spaces as they need

```ts
import { Client } from '@dxos/client';

const client = new Client();

await client.initialize();

const identity = client.halo.identity.get(); // null by default

// create an ephemeral space consistent across all windows on this device
const space = await client.createSpace({ ephemeral: true });

// create an ephemeral space for the current window only
const space = await client.createSpace({ ephemeral: true, replication: false });

// sense if a space is ephemeral
const isEphemeral = space.isEphemeral;

// sense if replicating across windows
const isReplicating = space.isReplicating;
```

```tsx
import { useSpace } from '@dxos/client';

const Component = () => {
  // graph a known ephemeral space
  const space = useSpace('app');

  // sense if a space is ephemeral
  const isEphemeral = space.isEphemeral;

  // sense if replicating across windows
  const isReplicating = space.isReplicating;

  const client = useClient();

  const action = () => {
    // create an ephemeral space consistent across all windows on this device
    const space = await client.createSpace({ ephemeral: true });

    // create an ephemeral space for the current window only
    const space = await client.createSpace({
      ephemeral: true,
      replication: false,
    });
  };

  return <a onClick={action}></a>;
};
```
