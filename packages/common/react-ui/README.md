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
import { themePlugin } from '@dxos/react-ui/plugin';
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

### 3. Boostrap theming

In order to display the correct theme, you need to mark `<html>` with the correct class _from the `<head>` tag_, otherwise it will flash the wrong theme:

```html
<head>
  <script>
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  </script>
</head>
```

If you want to keep up with `prevers-color-scheme`, add:
```js
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){ if(e.matches){
  document.documentElement.classList.add('dark')
} else {
  document.documentElement.classList.remove('dark')
}})
```

You can augment this predicate checking any preferences saved in `localStorage`, etc.

### Done

Now you can use Tailwind CSS classnames in components.
