//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import * as fs from 'fs';
import glob from 'glob';
import * as path from 'path';
import * as process from 'process';
import { read } from 'to-vfile';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { createParser } from './parser.js';

const log = debug('dxos:ridoculous:main');
debug.enable(process.env.DEBUG ?? 'dxos:ridoculous:main');

interface Options {
  baseDir?: string
  files?: string
  html?: boolean
  toc?: string
  outDir?: string
}

// TODO(burdon): Factor out to lib.
const parse = async ({
  baseDir = process.cwd(),
  files = 'docs/**/*.md',
  html = false,
  toc,
  outDir = './out'
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
    log(`Wrote: ${outFilename}`);
  }
};

const main = () => {
  yargs(hideBin(process.argv))
    .scriptName('ridoculous')
    .option('files', {
      description: 'Markdown files glob',
      type: 'string',
      default: 'docs/**/*.md'
    })
    .option('baseDir', {
      description: 'Root directory',
      type: 'string'
    })
    .option('toc', {
      description: 'Regexp for table of contents header',
      type: 'string',
      default: '.*contents.*'
    })
    .option('html', {
      description: 'Output HTML',
      type: 'boolean'
    })
    .command({
      command: '*',
      handler: async ({
        baseDir,
        files,
        html,
        toc
      }: {
        baseDir: string,
        files: string,
        html: boolean,
        toc: string
      }) => {
        void parse({
          baseDir,
          files,
          html,
          toc
        });
      }
    })
    .help()
    .argv;
};

void main();
