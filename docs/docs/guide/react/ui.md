---
order: 20
---

# UI Components

There are several open-source packages of UI components available:

| Package                  | Description                                                                                                                                                                                                                                                      | Audience |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| `@dxos/react-components` | A set of pure components and tokens like colors and sizes that form a UI system based on `radix`, `phosphor`, `react`, and `tailwind`. | Any react application. |
| `@dxos/react-shell`      | A set of components, pages, layouts and specific user workflows for working with [ECHO](../platform) [spaces](../glossary#space), invitations, and join-flows. Depends on `@dxos/react-components`. | Any react application using ECHO and HALO. |
| `@dxos/react-appkit`     | A set of components, pages, and layouts that are shared across DXOS-owned applications like the [HALO app](../platform/halo) itself. | Applications built and operated by DXOS. |

## Installation

To use components from any of the packages above, the main theme stylesheet needs to be imported from `@dxos/react-components`.

::: note
Apps based on the DXOS [application templates](../cli/app-templates) have DXOS UI Components built-in by default.
:::

### With [Vite](https://vitejs.dev)

Configure the `ThemePlugin` in [`vite.config.js`](https://vitejs.dev/config/):

```ts file=./snippets/vite-config.ts#L5-
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { ThemePlugin } from '@dxos/aurora-theme/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}')
      ]
    })
  ]
});
```

The content array should contain globs that match any other code which will contain `tailwind` css classes.

Import the special DXOS theme stylesheet `@dxosTheme` anywhere in code such as `main.tsx`:

```tsx{1} file=./snippets/vite-main.tsx#L5-
import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<main></main>);
```

::: tip Tip
For best results, load `@dxosTheme` ahead of any other stylesheets.
:::
