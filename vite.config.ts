import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import { ThemePlugin } from '@dxos/ui-theme/plugin';
import { IconsPlugin, iconSymbolPattern } from '@dxos/vite-plugin-icons';

const phosphorIcons = path.join(import.meta.dirname, 'node_modules/@phosphor-icons/core/assets');

export default defineConfig({
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['@dxos/wa-sqlite', '@automerge/automerge', '@automerge/automerge-subduction'] },
  worker: { format: 'es', plugins: () => [wasm()] },
  plugins: [
    IconsPlugin({
      symbolPattern: iconSymbolPattern({ sets: ['ph'] }),
      assetPath: (_set, name, variant) => `${phosphorIcons}/${variant}/${name}${variant === 'regular' ? '' : `-${variant}`}.svg`,
      spriteFile: 'icons.svg',
      contentPaths: ['src/**/*.{ts,tsx}', 'node_modules/@dxos/react-ui*/dist/**/*.mjs'],
    }),
    ThemePlugin(),
    react(),
    wasm(),
  ],
});
