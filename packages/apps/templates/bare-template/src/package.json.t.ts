//
// Copyright 2022 DXOS.org
//
import { defineTemplate, ExtractInput, z } from '@dxos/plate';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
import { PackageJson } from 'types-package-json';
import merge from 'lodash.merge';

import config from './config.t';

type Context = { version: string; depVersion: string } & ExtractInput<typeof config>;

export namespace Features {
  export const react = ({ depVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@dxos/react-client': depVersion,
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      'react-router-dom': '^6.3.0'
    },
    devDependencies: {
      '@types/react': '^18.0.21',
      '@types/react-dom': '^18.0.6',
      '@vitejs/plugin-react': '^2.0.1'
    }
  });

  export const dxosUi = ({ depVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@dxos/react-ui': depVersion,
      '@dxos/react-uikit': depVersion,
      '@dxos/react-appkit': depVersion,
      'phosphor-react': '^1.4.1'
    }
  });

  export const tailwind = (): Partial<PackageJson> => ({
    devDependencies: {
      tailwindcss: '^3.2.4',
      autoprefixer: '^10.4.13',
      postcss: '^8.4.20'
    }
  });

  export const storybook = (): Partial<PackageJson> => ({
    scripts: {
      storybook: 'start-storybook -p 9009 --no-open'
    },
    devDependencies: {
      '@babel/core': '^7.18.13',
      '@storybook/addon-actions': '^6.5.10',
      '@storybook/addon-essentials': '^6.5.10',
      '@storybook/addon-interactions': '^6.5.10',
      '@storybook/addon-links': '^6.5.10',
      '@storybook/builder-vite': '^0.2.2',
      '@storybook/mdx2-csf': '^0.0.3',
      '@storybook/react': '^6.5.10',
      '@storybook/testing-library': '^0.0.13',
      'require-from-string': '^2.0.2',
      'storybook-dark-mode': '^1.1.2',
      webpack: '^5.74.0'
    }
  });

  export const pwa = (): Partial<PackageJson> => ({
    devDependencies: {
      'vite-plugin-pwa': '^0.12.4',
      'workbox-window': '^6.5.4'
    }
  });
}

export const base = ({ name, version, depVersion }: Context): Partial<PackageJson> => {
  return {
    name,
    version: version,
    description: `${name} - a DXOS application`,
    scripts: {
      build: 'NODE_OPTIONS="--max-old-space-size=4096" tsc --noEmit && vite build',
      deploy: 'NODE_OPTIONS="--max-old-space-size=4096" dx app publish',
      preview: 'vite preview',
      serve: 'vite'
    },
    dependencies: {
      '@dxos/client': depVersion,
      '@dxos/config': depVersion
    },
    devDependencies: {
      '@types/node': '^18.11.9',
      '@dxos/cli': depVersion,
      typescript: '^4.8.4',
      vite: '3.2.5'
    }
  };
};

export default defineTemplate(
  async ({ input }) => {
    const { react, monorepo, pwa, storybook, dxosUi, tailwind } = input;
    const { version: dxosVersion, patchedDependencies } = await getDxosRepoInfo();
    const version = monorepo ? dxosVersion : '0.1.0';
    const depVersion = monorepo ? `workspace:*` : dxosVersion;

    const context = {
      version,
      depVersion,
      ...input
    };

    const packageJson = merge(
      [
        base(context),
        react && Features.react(context),
        pwa && Features.pwa(),
        dxosUi && Features.dxosUi(context),
        tailwind && Features.tailwind(),
        storybook && Features.storybook(),
        monorepo && {
          pnpm: {
            patchedDependencies
          }
        }
      ].filter(Boolean)
    );

    const result = JSON.stringify(packageJson, null, 2);
    return result;
  },
  { config }
);
