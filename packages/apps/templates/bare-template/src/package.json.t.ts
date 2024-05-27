//
// Copyright 2022 DXOS.org
//
import path from 'path';
import { promises as fs } from 'fs';
import { InputOf, Slot } from '@dxos/plate';
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
      // TODO(wittjosiah): Don't upgrade to 18.2 yet.
      //   https://github.com/creativetimofficial/material-tailwind/issues/528#issuecomment-1856348865
      '@types/react': '~18.0.21',
      '@types/react-dom': '~18.0.6',
      '@vitejs/plugin-react': '^4.2.1',
    },
  });

  export const dxosUi = ({ depVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@dxos/react-ui': depVersion,
      '@phosphor-icons/react': '^2.0.5',
      'react-router-dom': '^6.4.0',
    },
    devDependencies: {
      '@dxos/react-ui-theme': depVersion,
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
      '@storybook/addon-essentials': '8.0.0-alpha.11',
      '@storybook/addon-interactions': '8.0.0-alpha.11',
      '@storybook/addon-links': '8.0.0-alpha.11',
      '@storybook/builder-vite': '8.0.0-alpha.11',
      '@storybook/core-server': '8.0.0-alpha.11',
      '@storybook/mdx2-csf': '^1.1.0',
      '@storybook/react': '8.0.0-alpha.11',
      '@storybook/react-vite': '8.0.0-alpha.11',
    },
  });

  export const pwa = (): Partial<PackageJson> => ({
    devDependencies: {
      'vite-plugin-pwa': '^0.17.4',
      'workbox-window': '^7.0.0',
    },
  });

  export const schema = ({ depVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@dxos/echo-schema': depVersion,
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
      preview: 'vite preview',
      serve: 'vite',
    },
    dependencies: {
      '@dxos/client': depVersion,
      '@dxos/config': depVersion,
      '@dxos/shell': depVersion,
    },
    devDependencies: {
      '@types/node': '^18.11.9',
      '@types/sharedworker': '^0.0.111',
      typescript: '^5.0.4',
      vite: '^5.0.12',
      'vite-plugin-top-level-await': '^1.4.1',
      'vite-plugin-wasm': '^3.3.0',
    },
  };
};

// TODO(wittjosiah): Factor out.
const loadJson = async (moduleRelativePath: string) => {
  const content = await fs.readFile(path.resolve(__dirname, moduleRelativePath));
  return JSON.parse(content.toString());
};

export default template.define
  .slots<{ packageJson?: Slot<Partial<PackageJson>, InputOf<typeof template>, { depVersion?: string }> }>({
    packageJson: {},
  })
  .text({
    content: async ({ input, slots: { packageJson: slotPackageJson } }) => {

      
      const { react, monorepo, pwa, storybook, dxosUi, tailwind, proto: schema } = input;
      // TODO(wittjosiah): Importing directly causes package.json to be included in the output.
      //   Including package.json in the output causes syncpack to fail sometimes.
      //   Upgrading syncpack will likely fix this but this is simpler for now.
      
      const ownPackageJson = await loadJson('../package.json'); // relative to .ts files in src by the rules of plate execution
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
        schema && Features.schema(context),
        slotPackageJson?.() ?? {},
      ].filter(Boolean);

      const packageJson = merge(first, ...rest);

      const result = JSON.stringify(packageJson, null, 2);
      return result;
    },
  });
