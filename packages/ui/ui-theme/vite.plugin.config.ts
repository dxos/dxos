//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';

// The `@dxos/ui-theme/plugin` entry point: the Vite plugin itself, which serves the theme from
// the published `src` directory.
//
// A standalone config rather than the shared `defineConfig`: this output is loaded by a
// consumer's Vite config, so it needs a CJS build alongside the ESM one.
//
// The two formats are two passes (`--mode cjs` selects the second) because they differ in a
// transform, not just an output option: `import.meta.dirname` has no meaning in CJS and
// rolldown would substitute an empty object for it.
export default defineConfig(({ mode }) => {
  const cjs = mode === 'cjs';
  return {
    build: {
      lib: {
        entry: { ThemePlugin: 'src/plugins/ThemePlugin.ts' },
        formats: [cjs ? 'cjs' : 'es'],
        fileName: (format, name) => `${name}.${format === 'cjs' ? 'cjs' : 'mjs'}`,
      },
      outDir: 'dist/plugin',
      // The CJS pass writes alongside the ESM one.
      emptyOutDir: !cjs,
      sourcemap: true,
      minify: false,
      rollupOptions: {
        // Runs in node under the consumer's own toolchain, so every dependency stays external.
        external: (id: string) => !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0'),
      },
    },
    ...(cjs ? { define: { 'import.meta.dirname': '__dirname' } } : {}),
  };
});
