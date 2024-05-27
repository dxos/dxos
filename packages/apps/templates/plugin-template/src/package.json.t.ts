//
// Copyright 2022 DXOS.org
//
import path from 'path';
import { promises as fs } from 'fs';
import { InputOf, Slot } from '@dxos/plate';
import { PackageJson } from './utils.t/packageJson';
import merge from 'lodash.merge';

import template from './template.t';

type Context = { version: string; frameworkVersion: string } & InputOf<typeof template>;

export namespace Features {
  export const react = (): Partial<PackageJson> => ({
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@types/react': '~18.2.0',
      '@types/react-dom': '~18.2.0',
      '@vitejs/plugin-react': '^4.2.1',
    },
  });

  export const dxosUi = ({ frameworkVersion }: Context): Partial<PackageJson> => ({
    dependencies: {
      '@phosphor-icons/react': '^2.0.5',
    },
    devDependencies: {
      '@dxos/react-ui': frameworkVersion,
      '@dxos/react-ui-theme': frameworkVersion,
    },
  });

  export const defaultPlugins = ({ frameworkVersion }: Context): Partial<PackageJson> => ({
    devDependencies: {
      'vite-plugin-wasm': '^3.3.0',
      'vite-plugin-top-level-await': '^1.3.1',
      '@dxos/react-client': frameworkVersion,
      '@dxos/config': frameworkVersion,
      '@dxos/shell': frameworkVersion,
      '@braneframe/plugin-space': frameworkVersion,
      '@braneframe/plugin-navtree': frameworkVersion,
      '@braneframe/plugin-layout': frameworkVersion,
      '@braneframe/plugin-graph': frameworkVersion,
      '@braneframe/plugin-client': frameworkVersion,
      '@braneframe/plugin-stack': frameworkVersion,
      '@braneframe/plugin-metadata': frameworkVersion,
      '@braneframe/plugin-settings': frameworkVersion,
    },
  });
}

export const base = ({ name, version, frameworkVersion }: Context): Partial<PackageJson> => {
  return {
    name,
    version: version,
    description: `${name} - a composer plugin`,
    private: true,
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      dev: 'vite',
    },
    dependencies: {
      '@preact/signals-react': '^1.3.6',
      '@dxos/app-framework': frameworkVersion,
    },
    devDependencies: {
      '@types/node': '^18.11.9',
      vite: '^5.1.3',
      typescript: '^5.0.4',
      '@braneframe/plugin-theme': frameworkVersion,
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
      // TODO(wittjosiah): Importing directly causes package.json to be included in the output.
      //   Including package.json in the output causes syncpack to fail sometimes.
      //   Upgrading syncpack will likely fix this but this is simpler for now.
      const ownPackageJson = await loadJson('../package.json'); // relative to dist/src
      const context = {
        version: '0.0.1',
        frameworkVersion: ownPackageJson.version,
        ...input,
      };

      const [first, ...rest] = [
        base(context),
        Features.react(),
        Features.dxosUi(context),
        input.defaultPlugins && Features.defaultPlugins(context),
        slotPackageJson?.() ?? {},
      ].filter(Boolean);

      const packageJson = merge(first, ...rest);

      const result = JSON.stringify(packageJson, null, 2);
      return result;
    },
  });
