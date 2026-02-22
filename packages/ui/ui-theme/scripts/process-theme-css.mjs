#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import postcssNesting from 'postcss-nesting';

// Only inline @imports and process nesting.
// Do NOT run tailwindcss() here - @apply is processed at Vite runtime with content paths.
const processor = postcss([
  postcssImport(),
  postcssNesting(),
]);

const inputFile = 'src/theme.css';
const outputFiles = [
  'dist/plugin/node-esm/theme.css',
  'dist/plugin/node-cjs/theme.css',
];

async function processCSS() {
  console.log(`Reading ${inputFile}...`);
  const css = await readFile(inputFile, 'utf8');

  console.log('Processing CSS (inlining imports)...');
  const result = await processor.process(css, {
    from: inputFile,
    to: outputFiles[0],
  });

  for (const outputFile of outputFiles) {
    console.log(`Writing ${outputFile}...`);
    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, result.css);
  }

  console.log('Done!');
}

processCSS().catch((err) => {
  console.error('Error processing CSS:', err);
  process.exit(1);
});
