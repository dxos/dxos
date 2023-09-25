---
order: 20
---

# Aurora UI

There are several open-source packages of UI components available:

| Package                 | Description                                                                                                    | Audience                                          |
| :---------------------- | :------------------------------------------------------------------------------------------------------------- | :------------------------------------------------ |
| `@dxos/aurora`          | A set of lookless components in a UI system based on `radix`, `phosphor`, `react`, and `tailwind`.             | Any react application.                            |
| `@dxos/aurora-theme`    | A default theme for aurora                                                                                     | Any react application.                            |
| `@dxos/aurora-types`    | TypeScript types for the UI system.                                                                            | Any react application using Aurora.               |
| `@dxos/aurora-composer` | A collaborative rich text editor component.                                                                    | Any react application using Aurora (and/or ECHO). |
| `@dxos/aurora-grid`     | A data grid component.                                                                                        | Any react application using Aurora (and/or ECHO). |
| `@dxos/aurora-table`    | A data table component.                                                                              | Any react application using Aurora (and/or ECHO). |
| [`@dxos/react-shell`](./shell)     | A set of components and specific UI flows for managing [ECHO](../platform) spaces, invitations, and identity. | Any react application using ECHO and HALO.        |

## Aurora Installation

Install the `@dxos/aurora` package with your package manager and follow steps below.

::: note
Apps based on the DXOS [application templates](../cli/app-templates) have Aurora configured by default, which can be turned off with `--interactive` mode.
:::

### With [Vite](https://vitejs.dev)

::: details Install with Vite

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

::: details Install with other bundlers

The special `@dxosTheme` import will not be a available. Include the following stylesheet in your `index.html`:

    node_modules/@dxos/aurora/dist/plugin/node/theme.css

This package exports both CJS and ESM builds of its components, though these are styled with Tailwind as the design token system. Any build stack can use the component builds in this package, you’ll just need to configure your build to handle Tailwind so that styles are applied correctly.

Follow the [Tailwind Framework Guides documentation](https://tailwindcss.com/docs/installation/framework-guides) relevant to your stack to see how that’s done, but make the following modifications:

*   Use the Tailwind configuration from this package:

```ts
import tailwindcss from 'tailwindcss';
import { tailwindConfig } from '@dxos/react-components';
// ...
tailwindcss(
  tailwindConfig({
    content: [/* Wherever else Tailwind utility classes are used */],
    /* Optional params as neeeded */
  })
)
// ...
```

*   Instead of adding the Tailwind directives to your own CSS, use or import this package’s `theme.css` (`@dxos/aurora/dist/plugin/node/theme.css`) which adds the Tailwind directives itself.
*   This package relies on font assets installed via npm as dependencies; if you’re seeing errors in the browser console or build logs about missing `.woff2` files, ensure your build can correctly resolve the import directives used in `theme.css` e.g. `@import '@fontsource/roboto-flex/variable-full.css'`.

:::

### Add peer dependencies

This package uses icons from `phosphor-icons`, but lists them as a peer dependency to avoid re-exporting that package; use your project’s package manager to add `phosphor-icons` as a dependency.

## Using Aurora

To use aurora components, wrap your app with a `<ThemeProvider />` component:

```tsx file=./snippets/theme-provider.tsx#L5-
import React from 'react';
import { render } from 'react-dom';

import { ThemeProvider } from '@dxos/aurora';

render(
  <ThemeProvider>
    {/* your components using aurora here */}
  </ThemeProvider>,
  document.getElementById('root'),
);
```

## Dark and Light modes

Dark and Light modes are controlled by the application of the `dark` class.

::: tip Tip
To prevent flash of unstyled content, ensure the document features the right class ahead of first render. Include the below initializing code in the \<head> of your document to achieve this.
:::

```html file=./snippets/dark-mode.html
<head>
  <script>
    function setTheme(darkMode) {
      document.documentElement.classList[darkMode ? 'add' : 'remove']('dark')
    }
    setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      setTheme(e.matches)
    });
  </script>
</head>
```

Note that you can apply this classname selectively further down the DOM tree if needed.

## Browsing Components

[Storybook](https://storybook.js.org/) is used to browse and test components.

*   [aurora storybook](https://609d2a9c8202250039083fbb-owiqnnxehq.chromatic.com/).
*   [react-shell storybook](https://64c18b27fca920629f846e5b-qdjdssmfjl.chromatic.com/)
