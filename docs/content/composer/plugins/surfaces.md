---
order: 5
---
# Surfaces

Given any kind of `data` value, the `Surface` figures out how to render it based on the plugins available in context.

For example, some plugins provide a specific kind of editor, such as a color picker. They would implement `provides.surface.component() => <ColorPicker />` whenever the given `data` is a color value.

The entire user interface of Composer is constructed of Surfaces, and the core plugins `provide` basic components that fulfill them.

Surfaces enable developers to change the entire look and feel of Composer by extending or replacing specific plugins.

```tsx
import { definePlugin, SurfaceProvides } from '@dxos/app-framework';

export default definePlugin({
  provides: {
    // return any component that can render the data or null otherwise
    component: ({ data, role }) => <></>, 
  }
});

```