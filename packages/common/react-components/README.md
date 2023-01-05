# DXOS design system

The `react-components` package is the single source of truth for DXOS’s lower-level design system.

To get started, you’ll need to add the build plugin (Vite or ESBuild), then set up the provider, then set up theming.

## How to use with Vite

Using the design system requires opting-in in a few places, but by design it
otherwise needs no configuration.

### 1. Add the Vite plugin

Add `@dxos/react-components` to the project’s dev dependencies, then extend the
project’s Vite config (`vite.config.ts`) to use it, e.g.:

```ts
// ...
import { ThemePlugin } from '@dxos/react-components/plugin';
// ...
export default defineConfig({
  // ...
  plugins: [
    // ...
    ThemePlugin({content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']}),
    // ...
  ]
  // ...
});
// ...
```

Ensure `content` contains globs for your project’s own files that will use Tailwind classnames, as well as any DXOS
design system packages your project uses, e.g.:

```
'./node_modules/@dxos/react-components/dist/**/*.mjs',
'./node_modules/@dxos/react-appkit/dist/**/*.mjs',
'./node_modules/@dxos/react-composer/dist/**/*.mjs',
```

### 2. Reference the basic stylesheet

In the file which calls React DOM’s `createRoot` or `render`, add:

```ts
import '@dxosTheme';
```

### Done

Now you can use Tailwind utility classnames in your project.

## How to use with ESBuild

The ESBuild plugin is experimental and has several caveats noted below, proceed with caution.

### 1. Add the ESBuild plugin

Add `@dxos/react-components` to the project’s dev dependencies, then extend the
project’s ESBuild config to use it, e.g.:

```ts
// ...
import { ThemePlugins } from '@dxos/react-components/esbuild-plugin';
// ...
void build({
  entryPoints: [/* ... */, resolve(__dirname, '../node_modules/@dxos/react-components/src/theme.css')],
  // ...
  plugins: ThemePlugins({
    outdir: resolve(__dirname, '../dist'),
    content: [
      resolve(__dirname, '../index.html'),
      resolve(__dirname, '../src/**/*.{js,ts,jsx,tsx}'),
      resolve(__dirname, '../node_modules/@dxos/react-components/dist/**/*.mjs')
      // other sources to scan
    ]
  })
});
// ...
```

Ensure `theme.css` from `react-components` is included as an entrypoint, and `outdir` passed to `ThemePlugins` is the same as
provided to ESBuild.

### 2. Reference the basic stylesheet

Load the built stylesheet as appropriate for your project, e.g. simply add it to `index.html`:

```html
<link rel="stylesheet" href="./dist/node_modules/@dxos/react-components/src/theme.css"/>
```

Note that _this is not in your project’s node_modules directory_, it’s in your project’s `outdir`.

### Done

Now you can use Tailwind utility classnames in your project.

## Set up the provider

In order for the project to render correctly, wrap your app with `<UiProvider/>`.

## Set up theming

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

You could combine the two with a script like this one:

```js
function setTheme(darkMode) {
  document.documentElement.classList[darkMode ? 'add' : 'remove']('dark')
}
setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
  setTheme(e.matches)
});
```

You can augment this predicate checking any preferences saved in `localStorage`, etc.

Note that you can apply this classname selectively further down the DOM tree if needed.
