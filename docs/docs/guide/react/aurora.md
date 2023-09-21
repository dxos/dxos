---
order: 20
---

# Aurora UI

There are several open-source packages of UI components available:

| Package                  | Description                                                                                                                                                                                                                                                      | Audience |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| `@dxos/aurora` | A set of lookless components in a UI system based on `radix`, `phosphor`, `react`, and `tailwind`. | Any react application. |
| `@dxos/aurora-theme` | A default theme for aurora | Any react application. |
| `@dxos/react-shell`         | A set of components and specific workflows for managing [ECHO](../platform) spaces, invitations, and identity. | Any react application using ECHO and HALO. |

## Aurora Installation

Install the `@dxos/aurora` package with your package manager and follow steps below.

::: note
Apps based on the DXOS [application templates](../cli/app-templates) have Aurora built-in by default.
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

### With other bundlers

The special `@dxosTheme` import will not be a available. Include the following stylesheet in your `index.html`:

```
node_modules/@dxos/aurora/dist/plugin/node/theme.css
```

## Using Aurora

To use aurora components, ensure you have the `ThemeProvider` component somewhere in the tree above your usage:
  
  ```tsx file=./snippets/theme-provider.tsx#L5-