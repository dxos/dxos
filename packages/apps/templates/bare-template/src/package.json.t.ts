//
// Copyright 2022 DXOS.org
//
import path from 'path';
import { promises as fs } from 'fs';
import { InputOf } from '@dxos/plate';
import { getDxosRepoInfo } from './utils.t/getDxosRepoInfo';
import { PackageJson } from './utils.t/packageJson';

import merge from 'lodash.merge';

import template from './template.t';

type Context = { version: string; depVersion: string } & InputOf<typeof template>;

export namespace Features {
  export const react = ({ depVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@dxos/react-client': depVersion,
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      // 'react-router-dom': '^6.4.0'
    },
    devDependencies: {
      '@types/react': '^18.0.21',
      '@types/react-dom': '^18.0.6',
      '@vitejs/plugin-react': '^3.0.1',
    },
  });

  export const dxosUi = ({ depVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@dxos/aurora': depVersion,
      '@dxos/react-appkit': depVersion,
      '@phosphor-icons/react': '^2.0.5',
      'react-router-dom': '^6.4.0',
    },
    devDependencies: {
      '@dxos/aurora-theme': depVersion,
    },
  });

  export const tailwind = (): Partial<PackageJson> => ({
    devDependencies: {
      tailwindcss: '~3.2.7',
      autoprefixer: '^10.4.12',
      postcss: '^8.4.21',
    },
  });

  export const storybook = (): Partial<PackageJson> => ({
    scripts: {
      // TODO(burdon): No hard-coding of ports; reconcile all DXOS tools ports.
      storybook: 'start-storybook -p 9009 --no-open',
    },
    devDependencies: {
      '@storybook/addon-essentials': '^7.0.6',
      '@storybook/addon-interactions': '^7.0.6',
      '@storybook/addon-links': '^7.0.6',
      '@storybook/builder-vite': '^7.0.6',
      '@storybook/core-server': '^7.0.6',
      '@storybook/mdx2-csf': '^1.0.0',
      '@storybook/react': '^7.0.6',
      '@storybook/react-vite': '^7.0.6',
    },
  });

  export const pwa = (): Partial<PackageJson> => ({
    devDependencies: {
      'vite-plugin-pwa': '^0.14.1',
      'workbox-window': '^6.5.4',
    },
  });
}

export const base = ({ name, monorepo, version, depVersion }: Context): Partial<PackageJson> => {
  return {
    name: `${monorepo ? '@dxos/' : ''}${name}`,
    version: version,
    description: `${name}${monorepo ? '' : ' - a DXOS application'}`,
    private: true,
    scripts: {
      build: 'tsc --noEmit && vite build',
      deploy: 'dx app publish',
      preview: 'vite preview',
      serve: 'vite',
    },
    dependencies: {
      '@dxos/client': depVersion,
      '@dxos/config': depVersion,
      '@dxos/vault': depVersion,
    },
    devDependencies: {
      '@types/node': '^18.11.9',
      '@dxos/cli': depVersion,
      typescript: '^5.0.4',
      vite: '^4.3.9'
    }
  };
};

const loadJson = async (moduleRelativePath: string) => {
  const content = await fs.readFile(path.resolve(__dirname, moduleRelativePath));
  return JSON.parse(content.toString());
};

export default template.define.text({
  content: async ({ input }) => {
    const { react, monorepo, pwa, storybook, dxosUi, tailwind } = input;
    const ownPackageJson = await loadJson('../package.json'); // relative to dist/src
    const { version: packageVersion } = monorepo ? await getDxosRepoInfo() : ownPackageJson;
    const version = monorepo ? packageVersion : '0.1.0';
    const depVersion = monorepo ? `workspace:*` : packageVersion;

    const context = {
      version,
      depVersion,
      ...input,
    };

    const [first, ...rest] = [
      base(context),
      react && Features.react(context),
      pwa && Features.pwa(),
      dxosUi && Features.dxosUi(context),
      tailwind && Features.tailwind(),
      storybook && Features.storybook(),
    ].filter(Boolean);

    const packageJson = merge(first, ...rest);

    const result = JSON.stringify(packageJson, null, 2);
    return result;
  },
});
