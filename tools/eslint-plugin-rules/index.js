//
// Copyright 2022 DXOS.org
//

import comment from './rules/comment.js';
import header from './rules/header.js';
import noEmptyPromiseCatch from './rules/no-empty-promise-catch.js';
import enforceNamespaceImports from './rules/enforce-namespace-imports.js';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const plugin = {
  meta: {
    name: pkg.name,
    version: pkg.version,
    namespace: 'example',
  },
  rules: {
    comment,
    header,
    'no-empty-promise-catch': noEmptyPromiseCatch,
    'enforce-namespace-imports': enforceNamespaceImports,
  },
  configs: {
    recommended: {
      plugins: {
        'dxos-plugin': null,
      },
      rules: {
        'dxos-plugin/header': 'error',
        'dxos-plugin/no-empty-promise-catch': 'error',
        // Opt-in rule: enforce namespace imports for Effect packages
        // Enable it repo-wide in root eslint config
        'dxos-plugin/enforce-namespace-imports': ['error', { packages: ['effect', '@effect/*'] }],
        // TODO(dmaretskyi): Turned off due to large number of errors and no auto-fix.
        // 'dxos-plugin/comment': 'error',
      },
    },
  },
};

Object.assign(plugin.configs.recommended.plugins, {
  'dxos-plugin': plugin,
});

export default plugin;
