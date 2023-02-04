---
title: Other Hooks
order: 6
---
## React Hooks

The following are react hooks which ensure the reactivity of the underlying data sources and re-render consuming components when the data changes. Use all of these in a `<ClientProvider />` context.

:::apidoc[@dxos/react-client.useClient]
### [useClient()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L32)

Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Client</code>

Arguments: none
:::


:::apidoc[@dxos/react-client.useSelection]
### [useSelection(selection, deps)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L20)

Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result  must be passed to deps array
for updates to work correctly.

Returns: <code>undefined | T\[]</code>

Arguments:

`selection`: <code>Selection\<T, void> | SelectionResult\<T, any> | Falsy</code>

`deps`: <code>readonly any\[]</code>
:::