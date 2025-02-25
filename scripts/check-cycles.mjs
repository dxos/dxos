/* eslint-disable no-undef */
import glob from 'glob';
import madge from 'madge';

let files = glob.sync('packages/**/src/**/*.{ts,tsx}', {
  ignore: ['**/gen/**', '**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/scripts/**'],
});

// TODO(dmaretskyi): Glob ignore is not working.
const IGNORED = ['gen', 'dist'];

files = files.filter((file) => !IGNORED.some((ignored) => file.includes(ignored)));

console.log(`Running circular dependency check on ${files.length} files`);

const res = await madge(files, {
  detectiveOptions: {
    ts: {
      skipTypeImports: true,
    },
  },
});

// TODO(dmaretskyi): Can also output dot graph.
let circular = res.circular();

circular = circular.filter((c) => !IGNORED.some((ignored) => c[0].includes(ignored)));

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
