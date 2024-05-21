---
order: 6
---

# Surface

Given any kind of `data` value, the `Surface` figures out how to render it based on the plugins available in context.

For example, some plugins provide a specific kind of editor, such as a color picker. They would implement `provides.surface.component: () => <ColorPicker />` whenever the given `data` is a color value.

The entire user interface of Composer is constructed of Surfaces, and the core plugins `provide` basic components that fulfill them.

Surfaces enable developers to change the entire look and feel of Composer by extending or replacing specific plugins.

## Providing components

```tsx
import { definePlugin, SurfaceProvides } from '@dxos/app-framework';

export default definePlugin({
  provides: {
    // return any component that can render the data or null otherwise
    component: ({ data, role }) => <></>, 
  }
});

```

### Example

The following code demonstrates rendering a component for a value of a specific type. The `role` parameter is used to distinguish between different contexts in which the component is used.

The `<Surface />` rendering this component may be named `main` - which is a full-screen presentation of the entity, or `section` - which is a smaller presentation of the entity in the context of another collection or list of entities.

```tsx
import { definePlugin } from '@dxos/app-framework';

export default definePlugin({
  provides: {
    surface: {
      component: ({ data, role }) => {
        switch (role) {
          case "main":
            return isTypedObject(data.active) && isColor(data.active) ? (
              <ColorMain object={data.active} />
            ) : null;

          case "section":
            return isTypedObject(data.object) && isColor(data.object) ? (
              <ColorSection object={data.object} />
            ) : null;
        }

        return null;
      },
    },
  }
});
```

## Using Surfaces

To present arbitrary data, use the `<Surface />` component.

It will figure out how to render the data based on the plugins available in context.

```tsx
import { Surface } from '@dxos/app-framework';

export const MyComponent = ({ data }) => {
  // data can be anything
  // if plugins can identify it and provide components
  // surface will render them
  return (
    <div>
      <Surface data={data} role="main" />
    </div>
  );
};

```

When multiple plugins provide components for the same data, the `<Surface />` element can render all or some of them based on other props passed to `<Surface />`.

:::apidoc[@dxos/app-framework.SurfaceProps]{level="3"}
### Type `SurfaceProps`

<sub>Declared in [packages/sdk/app-framework/src/plugins/SurfacePlugin/Surface.tsx:29](https://github.com/dxos/dxos/blob/7194736719/packages/sdk/app-framework/src/plugins/SurfacePlugin/Surface.tsx#L29)</sub>

SurfaceProps are the props that are passed to the Surface component.
:::

## See also

* [Surface plugin source](https://github.com/dxos/dxos/blob/main/packages/sdk/app-framework/src/plugins/SurfacePlugin/plugin.tsx)
* [Surface component props and source](https://github.com/dxos/dxos/blob/main/packages/sdk/app-framework/src/plugins/SurfacePlugin/Surface.tsx)

::: note Under Development

The Composer Extensibility APIs are under active development. The API may change often, and these docs may not be accurate.

Talk to us on [Discord](https://discord.gg/eXVfryv3sW) with feedback anytime.

:::
