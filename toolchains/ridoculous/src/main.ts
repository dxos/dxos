//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import * as process from 'process';
import { read } from 'to-vfile';

// TODO(burdon): Note: .js extension is required.
//  https://github.com/microsoft/TypeScript/issues/40878 (Flame war).

import { createParser } from './parser.js';

const log = debug('dxos:ridoculous:main');
debug.enable('dxos:ridoculous:*'); // TODO(burdon): ENV.

// TODO(burdon): Yargs.
interface Options {
  baseDir?: string
  files?: string
  heading?: string
  html?: boolean
  outDir?: string
}

const main = async ({
  baseDir = process.cwd(),
  files = '*.md',
  heading = '.*contents.*',
  html = false,
  outDir = './out'
}: Options = {}) => {
  const parser = createParser({ baseDir, html, heading });

  const globFiles = glob.sync(files);
  for (const filename of globFiles) {
    log(`Parsing: ${filename}`);
    const text = await parser.process(await read(filename));

    const parts = path.parse(filename);
    const f = path.format({ ...parts, base: undefined, ext: '.html' });
    const outFilename = path.join(outDir, path.relative(baseDir, f));
    const dirname = path.dirname(outFilename);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }

    fs.writeFileSync(outFilename, text.toString() + '\n', 'utf8');
    log(`Parsing: ${outFilename}`);
  }
};

void main({
  baseDir: 'testing',
  files: 'testing/**/*.md',
  html: true
});
