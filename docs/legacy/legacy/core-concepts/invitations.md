---
title: Invitations
---

## Create an Invitation

To create an invitation, we first need to call to `useSecretGenerator` hook provided by `@dxos/react-client`:

```jsx
import { usespace, useSecretGenerator } from '@dxos/react-client';

const Component = ({ space_key }) => {
  const space = usespace(space_key);

  const [secretProvider, pin, resetPin] = useSecretGenerator();

  // ...
};
```

The Invitation flow requires the inviter and invitee to be online at the same time and is protected by a generated pin code.

### Return Values

| Property            | Description                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `secretProvider`    | Shared secret provider, the other peer creating the invitation must have the same secret. |
| `resetPin`          | Function allowing you to reset the flow with a new pin code                               |
| `pin`               | Protection pin code that the invitee should fill in once the `inviteCode` is validated    |

## Redeem an Invitation

As a user invited to a space, you need to validate both the `inviteCode` and the `pin` code. For this, you should use the `useSecretProvider` hook from `@dxos/react-client`:

```jsx
import { usespace, useSecretProvider } from '@dxos/react-client';

const Component = ({ space_key }) => {
  const space = usespace(space_key);

  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();

  // ...
};
```

### Return Values

| Property         | Description                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `secretProvider` | Shared secret provider, the other peer creating the invitation must have the same secret. |
| `secretResolver` | Function which you should call with the `pin` code once available.                        |
