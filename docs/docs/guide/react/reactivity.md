---
title: Reactivity
order: 6
---

# Reactivity

By default `@dxos/react-client` uses a reactivity model built on top of [`@preact/signals`](https://github.com/preactjs/signals).
Each ECHO object has a signal associated with it and any reads and writes to properties on the ECHO object notify the signal as well.
The [Signals React integration](https://github.com/preactjs/signals/blob/main/packages/react/README.md#react-integration) automatically instruments React to track all those reads and writes so the components are automatically reactive.

::: note Learn More
To learn more about the `signal` primitive, check out the [introductory blog post](https://preactjs.com/blog/introducing-signals).
:::

## ECHO

ECHO itself does not depend directly on `@preact/signals` but exposes an interface which allows any third-party signals library to integrate with it:

:::apidoc[@dxos/echo-schema.SignalsFactory]
:::

:::apidoc[@dxos/echo-schema.registerSignalsFactory]
:::

DXOS provides a `SignalsFactory` implementation for `@preact/signals` in the package `@dxos/echo-signals`.
That signals factory is automatically registered by `ClientProvider` to automatically provide reactivity.

::: tip Tip
The Signals integration can be disabled by passing `registerSignalsFactory={false}` as a prop to `ClientProvider`.
:::
