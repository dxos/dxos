//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';
import debug from 'debug';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import * as process from 'process';
import { read } from 'to-vfile';

import { createParser } from './parser.js';

const log = debug('dxos:ridoculous:processor');

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
  baseDir = process.cwd(),
  dryRun,
  files,
  html,
  outDir,
  verbose
}: Options = {}) => {
  const parser = createParser({ autoNumber, baseDir, html });

  const globFiles = glob.sync(files);
  for (const filename of globFiles) {
    log(`Parsing: ${filename}`);
    if (dryRun || verbose) {
      console.log(`Parsing: ${chalk.green(filename)}`);
    }

    // TODO(burdon): Catch errors.
    const text = await parser.process(await read(filename));

    if (!dryRun) {
      const parts = path.parse(filename);
      const f = path.format({ ...parts, base: undefined, ext: html ? '.html' : '.md' });
      const outFilename = path.join(outDir, path.relative(baseDir, f));
      const dirname = path.dirname(outFilename);
      if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
      }

      fs.writeFileSync(outFilename, text.toString() + '\n', 'utf8');
      console.log(`Updated: ${chalk.green(outFilename)}`);
    }
  }
};
