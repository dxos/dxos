#!/usr/bin/env node

import { globby } from 'globby';
import madge from 'madge';

const CONFIG = {
  // TODO(dmaretskyi): Add more packages.
  include: ['packages/{common,core}/**/*.{ts,tsx}'],
  ignoreGlobs: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/scripts/**'],
  ignorePathSegments: ['gen/', 'dist/'],
  gitignore: true,
};

const files = await globby(CONFIG.include, {
  ignore: CONFIG.ignoreGlobs,
  gitignore: CONFIG.gitignore,
});

const filteredFiles = files.filter((file) => !CONFIG.ignorePathSegments.some((ignored) => file.includes(ignored)));

console.log(`Running circular dependency check on ${filteredFiles.length} files`);

const res = await madge(filteredFiles, {
  detectiveOptions: {
    ts: {
      skipTypeImports: true,
    },
  },
});

// TODO(dmaretskyi): Can also output dot graph.
let circular = res.circular();

circular = circular.filter((c) => !CONFIG.ignorePathSegments.some((ignored) => c[0].includes(ignored)));

if (circular.length) {
  const grouped = groupBy(circular, (c) => c[0].split('/src/')[0]);
  for (const [category, cycles] of Object.entries(grouped)) {
    console.error(`## ${category}:`);
    for (const cycle of cycles) {
      console.error('Cycle:');
      for (const file of cycle) {
        console.error(`${file} ->`);
      }
      console.error(`${cycle[0]} (back to the start)`);
      console.error('');
    }
    console.error('\n');
  }

  console.error(`${Object.keys(grouped).length} packages with circular dependencies:`);
  for (const category of Object.keys(grouped)) {
    console.error(`- ${category}`);
  }
  process.exit(1);
}

function groupBy(arr, accessor) {
  return arr.reduce((acc, item) => {
    const key = accessor(item);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});
}
