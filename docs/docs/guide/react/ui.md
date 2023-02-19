---
order: 20
---

# UI Components

There are several open-source packages of UI components available:

| Package                  | Description                                                                                                                                                                                                                                                      | Audience |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| `@dxos/react-components` | A set of pure components and tokens like colors and sizes that form a UI system based on `radix`, `phosphor`, `react`, and `tailwind`. | Any react application. |
| `@dxos/react-ui`         | A set of components, pages, layouts and specific user workflows for working with [ECHO](../platform) [spaces](../glossary#space), invitations, and join-flows. Depends on `@dxos/react-components`. | Any react application using ECHO and HALO. |
| `@dxos/react-appkit`     | A set of components, pages, and layouts that are shared across DXOS-owned applications like the [HALO app](../platform/halo) itself. | Applications built and operated by DXOS. |

## Installation

### With Vite

Configure the `ThemePlugin` in `vite.config.js`:

```ts file=./snippets/vite-config.ts#L5-
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { ThemePlugin } from '@dxos/react-components/plugin';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    ThemePlugin({
      content: [
        resolve(__dirname, './index.html'),
        resolve(__dirname, './src/**/*.{js,ts,jsx,tsx}'),
        resolve(__dirname, './node_modules/@dxos/react-components/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-appkit/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-ui/dist/**/*.mjs'),
        resolve(__dirname, './node_modules/@dxos/react-list/dist/**/*.mjs')
      ]
    })
  ]
})
```

Import the DXOS theme stylesheet anywhere in code such as `main.tsx`:
```tsx file=./snippets/vite-main.tsx#L5-
```

::: tip Tip
For best results, the DXOS theme stylesheet should be loaded ahead of any other stylesheets.
:::