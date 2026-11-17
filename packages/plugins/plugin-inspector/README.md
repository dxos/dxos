# @dxos/plugin-inspector

Loads one plugin into a PLEX app and shows each of its modules working. The app runs on an in-memory client, so it
needs no account or server.

```tsx
import { Inspector } from '@dxos/plugin-inspector';

import { make } from './dx.config.ts';

export const App = () => <Inspector plugin={make()} />;
```

Or load a plugin from its dev server, the way Composer's Load dev plugin does. The page needs Composer's import map
(`importMapPlugin` from `@dxos/app-framework/vite-plugin`) so the plugin imports the page's copies of the shared
packages:

```tsx
<Inspector manifestUrl='http://localhost:3967/manifest.json' adds={['surface']} />
```

The header names the plugin and holds the sample object, which every module is shown with. The sidebar lists the
plugin's modules with their status: active, waiting on their activation event, or failed with the reason. Selecting
one shows it working:

- **Translations:** its strings, by namespace and language.
- **Schema:** each type's fields.
- **Create object:** Create, which adds an object and makes it the sample.
- **Surface:** each surface whose filter accepts the sample, rendered with it.
- **Operations:** each operation, run from a form built from its input schema.
- **Skill:** each skill, with the operations it gives the assistant.
- **App Graph:** the branches of App Graph that lead to what the plugin added.

`adds` lists the kinds of module a page of a tutorial adds; the inspector checks each against the plugin.

The DXOS docs embed it on each page of the PLEX learning path.
