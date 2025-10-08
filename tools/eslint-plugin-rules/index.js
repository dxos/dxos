//
// Copyright 2022 DXOS.org
//

import comment from './rules/comment.js';
import header from './rules/header.js';
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
    header,
    'no-empty-promise-catch': noEmptyPromiseCatch,
  },
  configs: {
    recommended: {
      plugins: {
        'dxos-plugin': plugin,
      },
      rules: {
        'dxos-plugin/header': 'error',
        'dxos-plugin/no-empty-promise-catch': 'error',
        // TODO(dmaretskyi): Turned off due to large number of errors and no auto-fix.
        // 'dxos-plugin/comment': 'error',
      },
    },
  },
};

export default plugin;
