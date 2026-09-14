//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';

// The `@dxos/ui-theme/plugin` entry point: the Vite plugin itself plus the theme CSS it serves
// to consumers that installed the package (rather than resolving `src/main.css` in-repo).
//
// A standalone config rather than the shared `defineConfig`: this output is loaded by a
// consumer's Vite config, so it needs a CJS build alongside the ESM one and a fixed
// `main.css` filename that `ThemePlugin` can resolve relative to itself.
//
// The two formats are two passes (`--mode cjs` selects the second) because they differ in a
// transform, not just an output option: `import.meta.dirname` has no meaning in CJS and
// rolldown would substitute an empty object for it.
export default defineConfig(({ mode }) => {
  const cjs = mode === 'cjs';
  return {
    build: {
      lib: {
        entry: cjs
          ? { ThemePlugin: 'src/plugins/ThemePlugin.ts' }
          : { ThemePlugin: 'src/plugins/ThemePlugin.ts', main: 'src/main.css' },
        formats: [cjs ? 'cjs' : 'es'],
        fileName: (format, name) => `${name}.${format === 'cjs' ? 'cjs' : 'mjs'}`,
      },
      outDir: 'dist/plugin',
      // The CJS pass writes alongside the ESM one.
      emptyOutDir: !cjs,
      // Library mode defaults to `false`, which rejects a CSS entry outright.
      cssCodeSplit: true,
      sourcemap: true,
      minify: false,
      rollupOptions: {
        // Runs in node under the consumer's own toolchain, so every dependency stays external.
        external: (id: string) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
        output: {
          // `ThemePlugin` resolves the shipped theme as `main.css` relative to its own module,
          // so the name must survive the build unhashed.
          assetFileNames: '[name][extname]',
        },
      },
    },
    ...(cjs ? { define: { 'import.meta.dirname': '__dirname' } } : {}),
  };
});
