//
// Copyright 2022 DXOS.org
//
import path from 'path';
import { promises as fs } from 'fs';
import { InputOf, Slot } from '@dxos/plate';
import { PackageJson } from './utils.t/packageJson';

import merge from 'lodash.merge';

import template from './template.t';

type Context = { version: string } & InputOf<typeof template>;

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

  export const dxosUi = (): Partial<PackageJson> => ({
    dependencies: {
      '@phosphor-icons/react': '^2.0.5',
    },
    devDependencies: {
      '@dxos/react-ui': '^0.4.6',
      '@dxos/react-ui-theme': '^0.4.6',
    },
  });

  export const defaultPlugins = (): Partial<PackageJson> => ({
    devDependencies: {
      'vite-plugin-top-level-await': '^1.3.1',
      'vite-plugin-wasm': '^3.3.0',
      '@dxos/config': '^0.4.6',
      '@braneframe/plugin-space': '^0.4.6',
      '@braneframe/plugin-navtree': '^0.4.6',
      '@braneframe/plugin-layout': '^0.4.6',
      '@braneframe/plugin-graph': '^0.4.6',
      '@braneframe/plugin-client': '^0.4.6',
      '@braneframe/plugin-stack': '^0.4.6',
    },
  });
}

export const base = ({ name, version }: Context): Partial<PackageJson> => {
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
      "@dxos/app-framework": "0.4.6",
    },
    devDependencies: {
      '@types/node': '^18.11.9',
      typescript: '^5.0.4',
      vite: '^5.1.3',
      '@braneframe/plugin-theme': '^0.4.6',
    },
  };
};

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
      const context = {
        version: '0.0.1',
        ...input,
      };

      const [first, ...rest] = [
        base(context),
        Features.react(),
        Features.dxosUi(),
        input.defaultPlugins && Features.defaultPlugins(),
        slotPackageJson?.() ?? {},
      ].filter(Boolean);

      const packageJson = merge(first, ...rest);

      const result = JSON.stringify(packageJson, null, 2);
      return result;
    },
  });
