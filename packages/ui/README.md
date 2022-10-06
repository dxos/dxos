# DXOS design system

The `ui` family of packages are the single source of truth for DXOS’s design
system.

## How to use

Using the design system requires opting-in in a few places, but by design it
otherwise needs no configuration.

### 1. Add the Vite plugin

Add `@dxos/ui-theme-plugin` to the project’s dev dependencies, then extend the
project’s Vite config to use it, e.g.:

```ts
// ...
import themePlugin from '@dxos/ui-theme-plugin';
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
import '@dxosUiTheme';
```

### 3. Use daisyUI class names in the project, fall back to Tailwind CSS class names as needed

Refer to [daisyUI docs](https://daisyui.com/components/) for supported patterns.

If you need to override a style, refer to [Tailwind CSS docs](https://tailwindcss.com/docs/aspect-ratio) for those class names.
