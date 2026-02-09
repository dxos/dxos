//
// Copyright 2022 DXOS.org
//

import comment from './rules/comment.js';
import effectSubpathImports from './rules/effect-subpath-imports.js';
import header from './rules/header.js';
import noEffectRunPromise from './rules/no-effect-run-promise.js';
import noEmptyPromiseCatch from './rules/no-empty-promise-catch.js';
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
    'effect-subpath-imports': effectSubpathImports,
    header,
    'no-effect-run-promise': noEffectRunPromise,
    'no-empty-promise-catch': noEmptyPromiseCatch,
  },
  configs: {
    recommended: {
      plugins: {
        'dxos-plugin': null,
      },
      rules: {
        'dxos-plugin/effect-subpath-imports': 'error',
        'dxos-plugin/header': 'error',
        'dxos-plugin/no-effect-run-promise': 'error',
        'dxos-plugin/no-empty-promise-catch': 'error',
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
