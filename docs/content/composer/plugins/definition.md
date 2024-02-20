---
order: 1
---
# Plugin Definition

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