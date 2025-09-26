---
order: 3
---

# Plugin Definition

A plugin is a javascript object with interfaces as described below.

## Meta

Plugins are identified by a list of properties stored in `plugin.meta`:

```ts
import { definePlugin } from '@dxos/app-framework';

export default definePlugin({
  id: 'org.example.my-plugin',
  name: 'My Plugin',
});
```

## Provides

Plugins can exchange functionality by exposing a `provides` object.

The contents of the provides object are of interest only to other plugins, which implement specific keys and values to define functionality with.

For example, the [Surface](surface.md) plugin defines a `provides.surface.component` object that `<Surface />` elements use to determine what components to use when rendering:

```tsx
import { definePlugin, SurfaceProvides } from '@dxos/app-framework';

export default definePlugin<SurfaceProvides>({
  meta: {
    id: 'my-plugin',
  },
  provides: {
    /* things the plugin provides */
    surface: {
      component: ({ data }) => <div>Your {data} component here</div>,
    },
  },
});
```

## Context

Plugins may provide a `context` component which will be used to wrap the entire application.

This enables plugins to share state and functionality with all the components of the app, most of which may be coming from other plugins.

The order in which contexts are nested depends on the order in which the plugins were provided to the `<App />` component in the [entry point](entry.md).

```tsx
import { PropsWithChildren } from 'react';
import { Plugin } from '@composer/core';

export default definePlugin({
  id: 'my-plugin',
  () => [
    defineModule({
      id: 'my-plugin/context',
      activatesOn: Events.Startup,
      activate: () => [],
    }),
  ]
});
```

## Root

Plugins may provide a `root` component which will be main element(s) of the application.

If multiple plugins provide a `root` component, they will render as a list of siblings.

```tsx
import { definePlugin } from '@dxos/app-framework';

export default definePlugin({
  id: 'my-plugin',
  () => [
    defineModule({
      id: 'my-plugin/root',
      activatesOn: Events.Startup,
      activate: () => [],
    }),
  ],
});
```

The entire application can be thought of as a set of composed contexts that wrap one or more `root` elements.

```tsx
// The app will be constructed as follows:
const App = () => (
  <ContextFromPluginOne>
    <ContextFromPluginTwo>
      {/* more contexts nest here ... */}
      <RootFromPluginOne />
      <RootFromPluginTwo />
      {/* more roots append here ... */}
    </ContextFromPluginTwo>
  </ContextFromPluginOne>
);
```

::: note Under Development

The Composer Extensibility APIs are under active development. The API may change often, and these docs may not be accurate.

Talk to us on [Discord](https://dxos.org/discord) with feedback anytime.

:::
