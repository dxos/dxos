---
title: Invitations
---

## Create an Invitation

To create an invitation, we first need to call to `useInvitation` hook provided by `@dxos/react-client`:

```jsx
import { useParty, useInvitation } from '@dxos/react-client';

const Component = ({ partyKey }) => {
  const party = useParty(partyKey);

  const [inviteCode, pin] = useInvitation(party.key, {
    onDone: () => {},
    onError: () => {},
    onExpiration: () => {},
    expiration: new Date(),
  });

  // ...
};
```

The Invitation flow requires the inviter and invitee to be online at the same time and is protected by a generated pin code.

### Params

| Property       | Description                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `party.key`    | The Party to create the invitation for.                                      |
| `onDone`       | Callback function called once the invite flow finishes successfully.         |
| `onError`      | Callback function called if the invite flow produces an error.               |
| `onExpiration` | Callback function called if the invite flow expired.                         |
| `expiration`   | (optional) Date.now()-style timestamp of when this invitation should expire. |

### Return Values

| Property     | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| `inviteCode` | Generated code that the invitee should complete to join the party                      |
| `pin`        | Protection pin code that the invitee should fill in once the `inviteCode` is validated |

## Redeem an Invitation

As a user invited to a party, you need to validate both the `inviteCode` and the `pin` code. For this, you should use the `useInvitationRedeemer` hook from `@dxos/react-client`:

```jsx
import { useParty, useInvitationRedeemer } from '@dxos/react-client';

const Component = ({ partyKey }) => {
  const party = useParty(partyKey);

  const [redeemCode, setPin] = useInvitationRedeemer({
    onDone: () => {},
    onError: () => {},
  });

  // ...
};
```

### Params

| Property  | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| `onDone`  | Callback function called once the invite flow finishes successfully. |
| `onError` | Callback function called if the invite flow produces an error.       |

### Return Values

| Property     | Description                                                        |
| ------------ | ------------------------------------------------------------------ |
| `redeemCode` | Function which you should call with the `invitationCode`.          |
| `setPin`     | Function which you should call with the `pin` code once available. |
