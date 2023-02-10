---
order: 3
---
# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers. 

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces).

:::apidoc[@dxos/react-client.useSpace]

### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L16)

Get a specific Space via its key.
Requires ClientContext to be set via ClientProvider.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments:

`spaceKey`: <code>PublicKeyLike</code>
:::
