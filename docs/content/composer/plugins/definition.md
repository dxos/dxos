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
  meta: {
    id: 'org.example.my-plugin',
  }
})
```

## Provides

Plugins can exchange functionality by exposing a `provides` object.

The contents of the provides object are of interest only to other plugins, which implement specific keys and values to define functionality with.

For example, the Surfaces plugin defines a `provides.surface.component` object that `<Surface />` elements use to determine what components to use when rendering: 

```tsx
import { definePlugin } from '@dxos/app-framework';

export default definePlugin(
  {
    meta: {
      id: 'my-plugin',
    },
    provides: {
      /* things the plugin provides */
      surface: {
        component: ({ data }) => <div>Your {data} component here</div>
      }
    }
  }
)
```
Plugins may also return a falsy value if they don't know how to render a given `data`.

## Context

Plugins may provide a `context` component which will be used to wrap the entire application.

This enables plugins to share state and functionality with all the components of the app, most of which may be coming from other plugins.

The order in which contexts are nested depends on the order in which the plugins were provided to the `<App />` component in the [entry point](entry).

```tsx
import { PropsWithChildren } from 'react';
import { Plugin } from '@composer/core';

export default definePlugin(
  {
    meta: {
      id: 'my-plugin',
    },
    provides: {
      context: ({ children }: PropsWithChildren) => (
        <div className="wrapper"> // wrap with anything here
          {children}
        </div>
      )
    }
  }
)
```