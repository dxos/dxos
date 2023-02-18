---
title: Spaces
---

A space is the DXOS element responsible for sharing content among the invited members. Each space is identified by a `public_key`.

## Create a space

space creation is handled through the `client.echo` object:

```jsx
import { useClient } from '@dxos/react-client';

const Component = () => {
  const client = useClient();

  const handleSubmit = async (title) => {
    const space = await client.echo.createspace();

    // TODO: shouldn't the title be set on createspace?
    await space.properties.name = title;

    console.log(space.key);
  };
};
```

After creating the space, we need to set the title property through the `setProperty` function.

## Fetch a single space

To be able to access a specific space, you should use the `usespace` hook from `@dxos/react-client`:

```jsx
import { usespace } from '@dxos/react-client';

const Component = ({ space_key }) => {
  const space = usespace(space_key);

  // ...
};
```

> This hook requires you to wrap your app with `ClientInitializer`. See [Create a Client](./client#create-a-client) for more details.

## Fetch all the Spaces

To be able to retrieve all the Spaces where the current user is in, you should use the `useSpaces` hook from `@dxos/react-client`:

```jsx
import { useSpaces } from '@dxos/react-client';

const Component = () => {
  const space = useSpaces();

  // ...
};
```

> This hook requires you to wrap your app with `ClientInitializer`. See [Create a Client](./client#create-a-client) for more details.
