---
order: 1
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