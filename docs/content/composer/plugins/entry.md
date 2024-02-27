---
order: 2
---
# Entry point

Composer is created by passing an array of `Plugin` instances to the `<App />` element provided by the framework.

The `<App />` element provides a full-screen `<Surface />` and the `PluginContext` to let nested components access the plugins.

```tsx
import { App } from '@dxos/app-framework';

<App plugins={[ /* core plugins */ ]} />
```

From here, the main `<Surface />` interrogates all the plugins to determine what component to fill the screen with. Components are also able to use more nested `<Surface />` elements to further delegate rendering to other plugins.


For example, the `Layout` plugin splits the screen into more Surfaces: a header, a left and a right sidebars, and a main content area. Each of these get fulfilled by components other plugins.
