//
// Copyright 2022 DXOS.org
//
import { defineTemplate } from '@dxos/plate';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
import config from './config.t';

export const reactDeps = ({ depVersion }: { depVersion: string }) => ({
  '@dxos/react-client': depVersion,
  react: '^18.2.0',
  'react-dom': '^18.2.0'
});
export const reactDevDeps = ({ depVersion }: { depVersion: string }) => ({
  '@types/react': '^18.0.21',
  '@types/react-dom': '^18.0.6',
  '@vitejs/plugin-react': '^3.0.1'
});
export const uiDeps = ({ depVersion }: { depVersion: string }) => ({
  '@dxos/react-components': depVersion,
  '@dxos/react-appkit': depVersion,
  'phosphor-react': '^1.4.1',
  'react-router-dom': '^6.3.0',
  sass: '^1.56.2'
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

export default defineTemplate(
  async ({ input }) => {
    const { name, react, monorepo, pwa, storybook, dxosUi: useDxosUi } = input;
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
        ...(useDxosUi ? uiDeps({ depVersion }) : {})
      },
      devDependencies: {
        '@types/node': '^18.11.9',
        '@dxos/cli': depVersion,
        typescript: '^4.8.4',
        vite: '4.0.4',
        ...(react ? reactDevDeps({ depVersion }) : {}),
        ...(pwa ? pwaDevDeps({ depVersion }) : {}),
        ...(storybook ? storybookDevDeps({ depVersion }) : {})
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

// export type Input = {
//   monorepo?: boolean
//   name: string
// }

// {
//   "name": "@dxos/bare-template",
//   "version": "0.1.13",
//   "private": true,
//   "description": "Application template with only the essentials.",
//   "homepage": "https://dxos.org",
//   "bugs": "https://github.com/dxos/dxos/issues",
//   "repository": "github:dxos/dxos",
//   "license": "MIT",
//   "author": "DXOS.org",
//   "scripts": {
//     "build": "tsc --noEmit && vite build",
//     "deploy": "dx app publish",
//     "preview": "vite preview",
//     "serve": "vite"
//   },
//   "dependencies": {
//     "@dxos/client": "workspace:*",
//     "@dxos/config": "workspace:*"
//   },
//   "devDependencies": {
//     "@dxos/cli": "workspace:*",
//     "@dxos/vite-plugin": "workspace:*",
//     "typescript": "^4.8.4",
//     "vite": "3.0.9"
//   }
// }

// const template: TemplateFunction<Input> = ({ input }) => /* javascript */ `{
//   "name": "${input.name}",
//   "version": "${packageJson.version}",
//   "private": true,
//   "description": "Application template with only the essentials.",
//   ${input.monorepo ? `
//   "homepage": "https://dxos.org",
//   "bugs": "https://github.com/dxos/dxos/issues",
//   "repository": "github:dxos/dxos",
//   "license": "MIT",
//   "author": "DXOS.org",
//   ` : ''}"scripts": {
//     "build": "tsc --noEmit && vite build",
//     "deploy": "dx app publish",
//     "preview": "vite preview",
//     "serve": "vite"
//   },
//   "dependencies": {
//     "@dxos/client": "${input.monorepo ? 'workspace:*' : packageJson.version}",
//     "@dxos/config": "${input.monorepo ? 'workspace:*' : packageJson.version}"
//   },
//   "devDependencies": {
//     "@dxos/cli": "${input.monorepo ? 'workspace:*' : packageJson.version}",
//     "@dxos/vite-plugin": "${input.monorepo ? 'workspace:*' : packageJson.version}",
//     "typescript": "^4.8.4",
//     "vite": "3.0.9"
//   }${input.monorepo ? '' : `,
//   "pnpm": {
//     "patchedDependencies": {
//       "vite@3.0.9": "patches/vite@3.0.9.patch"
//     }
//   }`}
// }`;

// export default template;
