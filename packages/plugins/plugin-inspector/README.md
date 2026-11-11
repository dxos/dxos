# @dxos/plugin-inspector

Loads one plugin into a PLEX app and shows what the framework loaded and created from it. The app runs on an in-memory
client, so it needs no account or server.

```tsx
import { Inspector } from '@dxos/plugin-inspector';

import { make } from './dx.config.ts';

export const App = () => <Inspector plugin={make()} />;
```

It has one panel per kind of contribution:

- **Plugin:** the plugin's metadata, and each module with its activation event and whether it is waiting, active or
  failed.
- **Translations:** every string, by language and namespace.
- **Types:** each type, created through the plugin's create-object contribution.
- **Surfaces:** each surface whose filter accepts the object selected in Types, rendered live.
- **Operations:** each operation, run from a form built from its input schema; each skill with the tools it gives.
- **App graph:** the app graph from its root.

`todo(step)` (also at `@dxos/plugin-inspector/todo`) is a placeholder for code a tutorial step writes. Using it throws a
`TodoError` naming the step, and the Plugin panel shows the step in place of the error.

The DXOS docs embed it on each page of the PLEX learning path.
