---
title: Other Hooks
order: 3
---

The following are react hooks which ensure the reactivity of the underlying data sources and re-render consuming components when the data changes. Use all of these in a `<ClientProvider />` context.

:::apidoc[@dxos/react-client.useClient]
### [useClient()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/react-client/src/client/ClientContext.tsx#L45)

Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: none
:::
