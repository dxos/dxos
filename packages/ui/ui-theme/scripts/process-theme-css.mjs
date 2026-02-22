#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';
import chTokens from '@ch-ui/tokens/postcss';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

// Import tokenSet from the compiled plugin output
const { tokenSet } = await import('../dist/plugin/node-esm/chunk-4A7CFNII.mjs');

console.log('tokenSet loaded:', tokenSet ? 'yes' : 'no');
console.log('tokenSet.colors:', tokenSet.colors ? Object.keys(tokenSet.colors) : 'none');

const inputFile = 'src/theme.css';
const outputFiles = [
  'dist/plugin/node-esm/theme.css',
  'dist/plugin/node-cjs/theme.css',
];

const processor = postcss([
  postcssImport(),
  postcssNesting(),
  chTokens({ config: () => tokenSet }),
  tailwindcss(),
  autoprefixer,
]);

async function processCSS() {
  console.log(`Reading ${inputFile}...`);
  const css = await readFile(inputFile, 'utf8');

  console.log('Processing CSS with PostCSS...');
  const result = await processor.process(css, {
    from: inputFile,
    to: outputFiles[0],
  });

  for (const outputFile of outputFiles) {
    console.log(`Writing ${outputFile}...`);
    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, result.css);
    if (result.map) {
      await writeFile(`${outputFile}.map`, result.map.toString());
    }
  }

  console.log('Done!');
}

processCSS().catch((err) => {
  console.error('Error processing CSS:', err);
  process.exit(1);
});
