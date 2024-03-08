---
order: 5
---

# Intent

Intents are a way for plugins to communicate with each other. They represent user actions and enable plugins to respond to events initiated by the user or any other plugin. They are similar to `actions` from `redux` in that they are plain javascript objects that describe an intention to change state.

## Handling intents

Intents dispatched by any plugin can be handled by any other plugin using an `intent` resolver.

```tsx
import { definePlugin, IntentResolverProvides } from '@dxos/app-framework';

export default definePlugin<IntentResolverProvides>({
  provides: {
    intent: {
      resolver: (intent) => {
        switch (intent.action) {
          case 'create-random-color':
            // handle the intent
            console.log('handled the create intent', intent);
            // any object returned will be dispatched as another intent
            return {
              action: 'set-theme-color',
              color: intent.color,
            };
        }
      },
    },
  },
});
```

## Dispatching intents

Intents can be dispatched by any plugin using the `dispatch` function provided by the intent plugin.

```tsx
import {
  definePlugin,
  SurfaceProvides,
  useIntentDispatcher,
} from '@dxos/app-framework';

export default definePlugin<SurfaceProvides>({
  provides: {
    surface: {
      component: ({ data, role }) => {
        const dispatch = useIntentDispatcher();
        return (
          <div
            onClick={() =>
              dispatch({
                action: 'create-random-color',
              })
            }
          ></div>
        );
      },
    },
  },
});
```

To dispatch multiple actions, pass an array of them to `dispatch`:

```tsx
dispatch([
  {
    action: 'create-random-color',
  },
  {
    action: SpaceAction.ADD_OBJECT,
    data: { target: parent.data },
  },
  {
    action: LayoutAction.ACTIVATE,
  },
]);
```

## See also

* [Intent plugin source](https://github.com/dxos/dxos/blob/main/packages/sdk/app-framework/src/plugins/IntentPlugin/plugin.tsx)

::: note Under Development

The Composer Extensibility APIs are under active development. The API may change often, and these docs may not be accurate.

Talk to us on [Discord](https://discord.gg/eXVfryv3sW) with feedback anytime.

:::
