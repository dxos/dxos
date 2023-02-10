---
order: 3
---

# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers.

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces) in `react`.

## Creating spaces
To create a space, call the `client.echo.createSpace()` API:

:::apidoc[@dxos/react-client.Client.echo]
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

Returns the first space in the current spaces array. If none exists, null
will be returned at first, then the hook will re-run and return a space once
it has been created. Requires a ClientProvider somewhere in the parent tree.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: none
:::
