//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import { read } from 'to-vfile';

import { createParser } from './parser.js';

interface Options {
  autoNumber?: boolean
  baseDir?: string
  dryRun?: boolean
  files?: string
  html?: boolean
  outDir?: string
  verbose?: boolean
}

export const processFiles = async ({
  autoNumber,
  baseDir,
  dryRun,
  files,
  html,
  outDir,
  verbose
}: Options = {}) => {
  const parser = createParser({ autoNumber, baseDir, html, verbose });

  const globFiles = glob.sync(path.join(baseDir ?? '', files));
  for (const filename of globFiles) {
    if (dryRun || verbose) {
      console.log(`Parsing: ${chalk.green(filename)}`);
    }

    // TODO(burdon): Catch errors.
    // https://github.com/vfile/vfile#filehistory
    const text = await parser.process(await read(filename));

    const parts = path.parse(filename);
    const f = path.format({ ...parts, base: undefined, ext: html ? '.html' : '.md' });
    const outFilename = path.join(outDir, path.relative(baseDir ?? '.', f));
    const dirname = path.dirname(outFilename);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    console.log(`Writing: ${chalk.green(outFilename)}`);
    if (!dryRun) {
      fs.writeFileSync(outFilename, text.toString() + '\n', 'utf8');
    }
  }
};
