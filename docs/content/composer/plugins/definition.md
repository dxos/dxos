---
order: 3
---
# Plugin Definition

Plugins are objects that can "provide" functionality by exposing a `provides` object.

The contents of the provides object are of interest only to other plugins, which implement specific keys and values to exchange functionality.

For example, the Surfaces plugin defines a `provides.components` object that `<Surface />` elements use to determine what components to use when rendering things.

```ts
import { Plugin } from '@composer/core';

export default definePlugin(
  {
    meta: {
      id: 'my-plugin',
    },
    provides: {
      /* things the plugin provides */
    }
  }
)
```

## Context

Plugins may provide a `context` component which will be used to wrap the entire application.

This enables plugins to share state and functionality with all the components of the app, most of which may be coming from other plugins.

The order in which contexts are nested depends on the order in which the plugins were provided to the `<App />` component.

```ts
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