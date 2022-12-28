//
// Copyright 2022 DXOS.org
//
import { defineTemplate } from '@dxos/plate';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
import { IPackageJson } from "types-package-json";

import config from './config.t';

type Context = { depVersion: string };

export const react = ({ depVersion } : Context): IPackageJson {

}

export const reactDeps = ({ depVersion }: { depVersion: string }) => ({
  '@dxos/react-client': depVersion,
  react: '^18.2.0',
  'react-dom': '^18.2.0',
  'react-router-dom': '^6.3.0'
});
export const reactDevDeps = ({ depVersion }: { depVersion: string }) => ({
  '@types/react': '^18.0.21',
  '@types/react-dom': '^18.0.6',
  '@vitejs/plugin-react': '^3.0.1'
});
export const uiDeps = ({ depVersion }: { depVersion: string }) => ({
  '@dxos/react-components': depVersion,
  '@dxos/react-appkit': depVersion,
  'phosphor-react': '^1.4.1'
});
export const pwaDevDeps = ({ depVersion }: { depVersion: string }) => ({
  'vite-plugin-pwa': '^0.14.1',
  'workbox-window': '^6.5.4'
});
export const storybookDevDeps = ({ depVersion }: { depVersion: string }) => ({
  '@storybook/addon-essentials': '^7.0.0-beta.19',
  '@storybook/addon-interactions': '^7.0.0-beta.19',
  '@storybook/addon-links': '^7.0.0-beta.19',
  '@storybook/builder-vite': '^7.0.0-beta.19',
  '@storybook/mdx2-csf': '^0.0.3',
  '@storybook/react': '^7.0.0-beta.19',
  '@storybook/react-vite': '^7.0.0-beta.19',
  'require-from-string': '^2.0.2',
  'storybook-dark-mode': '^1.1.2'
});
export const tailwindDevDeps = () => ({
  tailwindcss: '^3.2.4',
  autoprefixer: '^10.4.13',
  postcss: '^8.4.20'
});

export default defineTemplate(
  async ({ input }) => {
    const { name, react, monorepo, pwa, storybook, dxosUi, tailwind } = input;
    const { version: dxosVersion, patchedDependencies } = await getDxosRepoInfo();
    const version = monorepo ? dxosVersion : '0.1.0';
    const depVersion = monorepo ? `workspace:*` : dxosVersion;

    const storybookScripts = {
      storybook: 'start-storybook -p 9009 --no-open'
    };
    const packageJson = {
      name,
      version: version,
      private: true,
      description: `${name} - a DXOS application`,
      scripts: {
        build: 'NODE_OPTIONS="--max-old-space-size=4096" tsc --noEmit && vite build',
        deploy: 'NODE_OPTIONS="--max-old-space-size=4096" dx app publish',
        preview: 'vite preview',
        serve: 'vite',
        ...(storybook ? storybookScripts : {})
      },
      dependencies: {
        '@dxos/client': depVersion,
        '@dxos/config': depVersion,
        ...(react ? reactDeps({ depVersion }) : {}),
        ...(dxosUi ? uiDeps({ depVersion }) : {})
      },
      devDependencies: {
        '@types/node': '^18.11.9',
        '@dxos/cli': depVersion,
        typescript: '^4.8.4',
        vite: '4.0.4',
        ...(react ? reactDevDeps({ depVersion }) : {}),
        ...(pwa ? pwaDevDeps({ depVersion }) : {}),
        ...(storybook ? storybookDevDeps({ depVersion }) : {}),
        ...(tailwind ? tailwindDevDeps() : {})
      },
      ...(!monorepo
        ? {
            pnpm: {
              patchedDependencies
            }
          }
        : {})
    };
    const result = JSON.stringify(packageJson, null, 2);
    return result;
  },
  { config }
);
