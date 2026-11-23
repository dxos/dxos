//
// Copyright 2026 DXOS.org
//

import { DXOS_COMMIT } from '../echo/tutorial-project.ts';

/** The `@dxos/*` packages the Stash plugin imports, and their peers. */
const DXOS_PACKAGES = [
  'app-framework',
  'app-graph',
  'app-toolkit',
  'client',
  'compute',
  'echo',
  'echo-react',
  'plugin-space',
  'react-ui',
  // A peer of `app-graph`; from npm, its release would ask for an older `react`.
  'ui-theme',
];

/**
 * The tutorial plugin's `package.json`, pinned to the build the ECHO projects use. The host's `react`, `react-dom` and
 * `effect` replace the plugin's own at runtime, so they match the docs'.
 */
export const PACKAGE_JSON = {
  name: 'stash',
  version: '0.1.0',
  private: true,
  type: 'module',
  scripts: { dev: 'vite' },
  dependencies: {
    ...Object.fromEntries(
      DXOS_PACKAGES.map((name) => [`@dxos/${name}`, `https://pkg.pr.new/dxos/dxos/@dxos/${name}@${DXOS_COMMIT}`]),
    ),
    'effect': '4.0.4',
    'react': '~19.3.1',
    'react-dom': '~19.3.1',
  },
  devDependencies: {
    '@types/react': '^19.2.0',
    '@vitejs/plugin-react': '^6.1.1',
    'typescript': '^5.9.0',
    'vite': '^8.3.7',
  },
};

export const VITE_CONFIG = `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { composerPlugin } from '@dxos/app-framework/vite-plugin';

export default defineConfig({
  plugins: [...composerPlugin(), react()],
});
`;
