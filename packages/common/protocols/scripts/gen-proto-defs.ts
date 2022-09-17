//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import glob from 'glob';
import path from 'path';

const YEAR = new Date().getFullYear();
const HEADER = `//\n// Copyright ${YEAR} DXOS.org\n//\n\n// Generated file: do not edit.`;

/**
 * Generate protocol buffer definition files.
 */
// TODO(burdon): Move to toolchain.
const main = (
  pattern: string,
  prefix = './src/proto',
  dist = './dist/src/proto/gen',
  outdir = './proto'
) => {
  // https://nodejs.org/api/fs.html
  // https://nodejs.org/api/path.html
  fs.rmSync(outdir, { recursive: true, force: true });
  fs.mkdirSync(outdir);

  // README.
  fs.writeFileSync(path.join(outdir, 'README.md'), '# Protobuf Defs\n\nGenerated files: Do not edit.\n');

  // https://www.npmjs.com/package/glob
  const files = glob.sync(pattern);
  for (const file of files) {
    const idx = file.indexOf(prefix);
    if (idx === 0) {
      // Output directory.
      const sub = file.substr(prefix.length + 1);
      const dir = path.join(outdir, path.dirname(sub));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      // Output file.
      const filename = path.basename(sub, '.proto');
      const outfile = path.join(dir, `${filename}.d.ts`);

      // Relative path.
      const exportFile = path.join(path.dirname(sub), filename);
      const relative = path.join(path.relative(exportFile, '.'), dist, exportFile);

      fs.writeFileSync(outfile, `${HEADER}\nexport * from '${relative}';\n`);
    }
  }
};

main('./src/proto/**/*.proto');
