---
order: 2
next: core/
---
# Entry point

Composer is created by passing an array of `Plugin` instances to the `<App />` element provided by the framework.

The `<App />` element provides a full-screen `<Surface />` and the `PluginContext` to let nested components access the plugins.

```tsx
import { App } from '@dxos/app-framework';

<App plugins={[ /* core plugins */ ]} />
```

From here, it is up to the plugins to figure out what to render in the main `<Surface />`. 

By default, the `Layout` plugin implements a simple layout with a header, a left and a right sidebars, and a main content area.