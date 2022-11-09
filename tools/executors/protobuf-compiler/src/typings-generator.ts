//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import path from 'path';

import { logger } from './logger';

const HEADER = '// Generated file: do not edit.';

// NOTE: Proto package names must match the generated folder tree.
// TODO(burdon): Warn if does not match.

export type TypingGeneratorOptions = {
  files: string[];
  baseDir: string;
  outDir: string;
  distDir: string;
};

/**
 * Generates Typescript typings from protocol buffer definitions.
 */
export class TypingsGenerator {
  // prettier-ignore
  constructor (
    private readonly _options: TypingGeneratorOptions
  ) {}

  generate(verbose = false) {
    logger.logTypings(this._options.outDir, verbose);
    fs.rmSync(this._options.outDir, { recursive: true, force: true });
    fs.mkdirSync(this._options.outDir, { recursive: true });

    // Create README.
    fs.writeFileSync(path.join(this._options.outDir, 'README.md'), '# Generated Protobuf Defs');

    // https://www.npmjs.com/package/glob
    for (const file of this._options.files) {
      if (file.indexOf(this._options.baseDir) === -1) {
        console.warn(`File doesn't match baseDir: ${file}`);
        break;
      }

      // Output directory.
      const relativePath = file.substr(this._options.baseDir.length + 1);
      const relativeDir = path.join(this._options.outDir, path.dirname(relativePath));

      console.log({
        genDir: this._options.distDir,
        outDir: this._options.outDir,
        relativePath
      });

      process.exit();

      // Output file.
      const filename = path.basename(relativePath, '.proto');
      const jsOutFile = path.join(relativeDir, `${filename}.js`);
      const tsOutFile = path.join(relativeDir, `${filename}.d.ts`);
      const outFile = path.join(relativeDir, `${filename}.d.ts.map`);

      if (!fs.existsSync(relativeDir)) {
        fs.mkdirSync(relativeDir, { recursive: true });
      }

      // Relative path.
      const exportFile = path.join(path.dirname(relativePath), filename);
      const relativeFileDir = path.join(this._options.distDir, exportFile);

      // JS compiled output (required for tests).
      // Relative path to the `dist/src/proto/gen` folder.
      fs.writeFileSync(jsOutFile, `${HEADER}\nmodule.exports = require('${relativeFileDir}');\n`);

      // TS definitions.
      fs.writeFileSync(tsOutFile, `${HEADER}\nexport * from '${relativeFileDir}';\n`);

      // Source map definitions (enables IDE navigation in VSCode).
      // https://github.com/source-map/source-map-spec
      const defs = {
        version: 3,
        file: `${filename}.d.ts`,
        sourceRoot: '',
        sources: [path.join(path.relative(exportFile, '.'), this._options.baseDir, relativePath)],
        names: [],
        mappings: 'AAIA,cAAc,SAAS,CAAC;AACxB,cAAc,cAAc,CAAC;AAC7B,cAAc,aAAa,CAAC'
      };

      fs.writeFileSync(outFile, JSON.stringify(defs, undefined, 2) + '\n');
    }
  }
}
