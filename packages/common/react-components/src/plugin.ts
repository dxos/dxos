//
// Copyright 2022 DXOS.org
//

import autoprefixer from 'autoprefixer';
import { resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import type { ThemeConfig } from 'tailwindcss/types/config';
import { Plugin } from 'vite';

import { tailwindConfig } from './config';

export interface VitePluginTailwindOptions {
  jit?: boolean;
  cssPath?: string;
  virtualFileId?: string;
  content: string[];
}

/** These will automatically be included in tailwind content array unless otherwise specified */
const knownPeerPackages = ['@dxos/react-components', '@dxos/react-appkit', '@dxos/react-ui', '@dxos/react-list'];

const getPackageRootFromResolvedModule = (resolvedPath: string, packageName: string) => {
  const [, shortName] = packageName.split('/');
  if (!shortName) {
    throw new Error('invalid package name encountered ' + packageName);
  }
  const position = resolvedPath.indexOf(shortName);
  return resolvedPath.substring(0, position + shortName.length);
};

const ensureContentHasPeerPackages = (content: string[], rootPath: string) => {
  const result = [...content];
  knownPeerPackages.forEach((packageName) => {
    if (result.some((contentPath) => contentPath.indexOf(packageName) >= 0)) {
      return;
    }
    try {
      const resolved = require.resolve(packageName, {
        paths: [rootPath]
      });
      if (!resolved) {
        return;
      }
      const packageRoot = getPackageRootFromResolvedModule(resolved, packageName);
      result.push(resolve(packageRoot, 'dist/**/*.mjs'));
    } catch {}
  });
  return result;
};

// TODO(zhenyasav): make it easy to override the tailwind config
// TODO(zhenyasav): make it easy to add postcss plugins?
export const ThemePlugin = (
  options: Pick<VitePluginTailwindOptions, 'content'> & { extensions?: Partial<ThemeConfig>[] }
) => {
  const config: VitePluginTailwindOptions & Pick<typeof options, 'extensions'> = {
    jit: true,
    cssPath: resolve(__dirname, './theme.css'),
    virtualFileId: '@dxosTheme',
    ...options
  };

  return {
    name: 'vite-plugin-dxos-ui-theme',
    config: ({ root }, env) => {
      const content = ensureContentHasPeerPackages(config.content, root!);
      return {
        css: {
          postcss: {
            plugins: [
              tailwindcss(
                tailwindConfig({
                  env: env.mode,
                  root,
                  content,
                  extensions: config.extensions
                })
              ),
              autoprefixer
            ]
          }
        }
      };
    },
    resolveId: (id) => {
      if (id === config.virtualFileId) {
        return config.cssPath;
      }
    }
  } as Plugin;
};
