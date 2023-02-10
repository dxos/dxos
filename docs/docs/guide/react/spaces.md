---
order: 3
---

# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers.

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces) in `react`.

## Creating spaces

To create a space, call the `client.echo.createSpace()` API:

:::apidoc[@dxos/react-client.Client.echo]
# Class `Client`

<sub>Declared in [packages/sdk/client/dist/types/src/packlets/client/client.d.ts:23]()</sub>

The Client class encapsulates the core client-side API of DXOS.

### [constructor(\[options\])]()

Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments:

`options`: <code>[ClientOptions](/api/@dxos/react-client/types/ClientOptions)</code>

### [version]()

Type: <code>"0.1.23"</code>

The version of this client API

### [config]()

Type: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Current configuration object

### [echo]()

Type: <code>[EchoProxy](/api/@dxos/react-client/classes/EchoProxy)</code>

ECHO database.

### [halo]()

Type: <code>[HaloProxy](/api/@dxos/react-client/classes/HaloProxy)</code>

HALO credentials.

### [initialized]()

Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`

### [mesh]()

Type: <code>[MeshProxy](/api/@dxos/react-client/classes/MeshProxy)</code>

### [\[custom\]()]()

Returns: <code>string</code>

Arguments: none

### [createSerializer()]()

Returns: <code>[SpaceSerializer](/api/@dxos/react-client/classes/SpaceSerializer)</code>

Arguments: none

### [destroy()]()

Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise\<void></code>

Arguments: none

### [getStatus()]()

Get system status.

Returns: <code>Promise\<StatusResponse></code>

Arguments: none

### [initialize()]()

Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise\<void></code>

Arguments: none

### [reset()]()

Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise\<void></code>

Arguments: none

### [resumeHostServices()]()

Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise\<void></code>

Arguments: none

### [toJSON()]()

Returns: <code>object</code>

Arguments: none
:::

## Obtaining a Space reactively

These hooks are available from package [`@dxos/react-client`](https://www.npmjs.com/package/@dxos/react-client) and re-render reactively.

:::apidoc[@dxos/react-client.useSpace]
### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L18)

Get a specific Space using its key. Returns undefined when no spaceKey is
available. Requires a ClientProvider somewhere in the parent tree.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments:

`spaceKey`: <code>PublicKeyLike</code>
:::

:::apidoc[@dxos/react-client.useSpaces]
### [useSpaces()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L59)

Get all Spaces available to current user.
Requires a ClientProvider somewhere in the parent tree.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)\[]</code>

Arguments: none
:::

:::apidoc[@dxos/react-client.useOrCreateFirstSpace]
### [useOrCreateFirstSpace()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L29)

Returns the first space in the current spaces array. If none exist,  `null`
will be returned at first, then the hook will re-run and return a space once
it has been created. Requires a ClientProvider somewhere in the parent tree.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: none
:::
