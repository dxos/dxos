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
    devDependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      // TODO(wittjosiah): Don't upgrade to 18.2 yet.
      //   https://github.com/creativetimofficial/material-tailwind/issues/528#issuecomment-1856348865
      '@types/react': '~18.0.21',
      '@types/react-dom': '~18.0.6',
      '@vitejs/plugin-react': '^4.2.1',
    },
  });

  export const dxosUi = (): Partial<PackageJson> => ({
    dependencies: {
      // '@dxos/react-ui': depVersion,
      '@phosphor-icons/react': '^2.0.5',
      'react-router-dom': '^6.4.0',
    },
    devDependencies: {
      // '@dxos/react-ui-theme': depVersion,
    },
  });

  export const tailwind = (): Partial<PackageJson> => ({
    devDependencies: {
      tailwindcss: '~3.2.7',
      autoprefixer: '^10.4.12',
      postcss: '^8.4.21',
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
    devDependencies: {
      '@types/node': '^18.11.9',
      typescript: '^5.0.4',
      vite: '^5.1.3',
      "postcss": "^8.4.21",
      'vite-plugin-top-level-await': '^1.4.1',
      'vite-plugin-wasm': '^3.3.0',
      "autoprefixer": "^10.4.12",
      "tailwindcss": "~3.4.1"
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

      const [first, ...rest] = [base(context), slotPackageJson?.() ?? {}].filter(Boolean);

      const packageJson = merge(first, ...rest);

      const result = JSON.stringify(packageJson, null, 2);
      return result;
    },
  });
