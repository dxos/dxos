# DXOS Shell

A set of turnkey UI experiences developers can use to guide users through common identity and peer management tasks.

## Scenarios

For end users:

1. Users can create new HALO identities on supported devices
2. Users can link devices to existing HALO identities on other devices
3. Users can sign-in to applications with their HALO identity
4. Users can recover their identity on a new device using a paper key or passphrase (P3)

For developers: 5. Developers use the DXOS Shell to guide users through identity acquisition or recovery during login 6. Developers use the DXOS Shell to guide users through joining a space with an invite code 7. Developers use the DXOS Shell to guide users through inviting others to their spaces

## Requirements

1. The Shell API should be usable with any web framework in a browser
2. Bindings for specific frameworks should be thin, and focused on React only to start

## API

### Framework-agnostic TypeScript

```typescript

import { Client } from '@dxos/client'l

const client = new Client();

await client.initialize();

const shell = client.services.shell;

// acquire an identity
const identity = await shell.acquireIdentity();

// share a space
const { space, newMembers, error, cancelled } = await shell.inviteToSpace({
  spaceKey: 'abc123',
});

// join a space
const { space, success, error, cancelled } = await shell.joinSpace({
  inviteCode: 'abc123'
});

// redirections happen after shell succeeds using returned space value
if (success) {
  history.push(`/space/${space.key}/${queryString.documentId}`)
} else {
  history.push(`/error/${error.code}`)
}

// open halo panel
shell.home();

```
