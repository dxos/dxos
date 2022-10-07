# DXOS design system

The `react-ui` package is the single source of truth for DXOS’s design system.

## How to use

Using the design system requires opting-in in a few places, but by design it
otherwise needs no configuration.

### 1. Add the Vite plugin

Add `@dxos/react-ui` to the project’s dev dependencies, then extend the
project’s Vite config to use it, e.g.:

```ts
// ...
import themePlugin from '@dxos/react-ui/plugin';
// ...
export default defineConfig({
  // ...
  plugins: [
    // ...
    themePlugin({content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']}),
    // ...
  ]
  // ...
});
// ...
```

### 2. Reference the basic stylesheet

In the file which calls React DOM’s `createRoot` or `render`, add:

```ts
import '@dxosTheme';
```

### Done

Now you can use Tailwind CSS classnames in components.
