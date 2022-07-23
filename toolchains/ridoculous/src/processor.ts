//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import * as process from 'process';
import { read } from 'to-vfile';

import { createParser } from './parser.js';

const log = debug('dxos:ridoculous:processor');

interface Options {
  baseDir?: string
  files?: string
  html?: boolean
  toc?: string
  outDir?: string
  verbose?: boolean
}

export const processFiles = async ({
  baseDir = process.cwd(),
  files = 'docs/**/*.md',
  html = false,
  toc,
  outDir = './out',
  verbose
}: Options = {}) => {
  const parser = createParser({ baseDir, html, toc });

  const globFiles = glob.sync(files);
  for (const filename of globFiles) {
    log(`Parsing: ${filename}`);

    // TODO(burdon): Catch errors.
    const text = await parser.process(await read(filename));

    const parts = path.parse(filename);
    const f = path.format({ ...parts, base: undefined, ext: html ? '.html' : '.md' });
    const outFilename = path.join(outDir, path.relative(baseDir, f));
    const dirname = path.dirname(outFilename);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    fs.writeFileSync(outFilename, text.toString() + '\n', 'utf8');
    console.log(`Updated: ${outFilename}`);
  }
};
