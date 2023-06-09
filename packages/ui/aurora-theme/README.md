# Aurora main theme

**This readme is to be rewritten.**

The docs below are for this package’s predecessor.

---

The `react-components` package is the single source of truth for DXOS’s lower-level design system.

To get started, you’ll need to set up how you’ll build with this package, add peer dependencies, set up the provider, and set up theming.

## Set up the build…

### …with Vite

Using the design system requires opting-in in a few places, but by design it
otherwise needs no configuration.

#### 1. Add the Vite plugin

Add `@dxos/react-components` to the project’s dev dependencies, then extend the
project’s Vite config (`vite.config.ts`) to use it, e.g.:

```ts
// ...
import { ThemePlugin } from '@dxos/aurora-theme/plugin';
// ...
export default defineConfig({
  // ...
  plugins: [
    // ...
    ThemePlugin({
      root: __dirname,
      content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}']
    }),
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
'./node_modules/@dxos/aurora-composer/dist/**/*.mjs',
```

#### 2. Reference the basic stylesheet

In the file which calls React DOM’s `createRoot` or `render`, add:

```ts
import '@dxosTheme';
```

### …with ESBuild

The ESBuild plugin is experimental and has several caveats noted below, proceed with caution.

#### 1. Add the ESBuild plugin

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
      resolve(__dirname, '../node_modules/@dxos/aurora/dist/**/*.mjs'),
      resolve(__dirname, '../node_modules/@dxos/aurora-theme/dist/**/*.mjs')
      // other sources to scan
    ]
  })
});
// ...
```

Ensure `theme.css` from `react-components` is included as an entrypoint, and `outdir` passed to `ThemePlugins` is the same as
provided to ESBuild.

#### 2. Reference the basic stylesheet

Load the built stylesheet as appropriate for your project, e.g. simply add it to `index.html`:

```html
<link rel="stylesheet" href="./dist/node_modules/@dxos/react-components/src/theme.css"/>
```

Note that _this is not in your project’s node_modules directory_, it’s in your project’s `outdir`.

### …with your own build stack

This package exports both CJS and ESM builds of its components, though these are styled with Tailwind as the design token system. Any build stack can use the component builds in this package, you’ll just need to configure your build to handle Tailwind so that styles are applied correctly.

Follow the [Tailwind Framework Guides documentation](https://tailwindcss.com/docs/installation/framework-guides) relevant to your stack to see how that’s done, but make the following modifications:

- Use the Tailwind configuration from this package:
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
- Instead of adding the Tailwind directives to your own CSS, use or import this package’s `theme.css` (`react-components/dist/plugin/theme.css`) which adds the Tailwind directives itself.
- This package relies on font assets installed via npm as dependencies; if you’re seeing errors in the browser console or build logs about missing `.woff2` files, ensure your build can correctly resolve the import directives used in `theme.css` e.g. `@import '@fontsource/roboto-flex/variable-full.css'`.

If you have any issues integrating this package with your build, please file an issue including details about your build stack and what result you’re getting.

## Add peer dependencies

This package uses icons from `phosphor-icons`, but lists them as a peer dependency to avoid re-exporting that package; use your project’s package manager to add `phosphor-icons` as a dependency.

## Set up the provider

In order for the project to render correctly, wrap your app with `<ThemeProvider/>`.

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

If you want to keep up with `prefers-color-scheme`, add:

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
