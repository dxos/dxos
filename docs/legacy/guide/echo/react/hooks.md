---
title: Other Hooks
order: 3
---

The following are react hooks which ensure the reactivity of the underlying data sources and re-render consuming components when the data changes. Use all of these in a `<ClientProvider />` context.

:::apidoc[@dxos/react-client.useClient]

### useClient()

Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Client</code>

Arguments: none
:::
