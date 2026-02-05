//
// Copyright 2022 DXOS.org
//

import { existsSync, mkdirSync, rmdirSync, writeFileSync } from 'fs';
import { dirname, join, relative } from 'path';

import { parseFullyQualifiedName } from '../namespaces';

export type GeneratePackageExportsProps = {
  /**
   * Root directory of the project.
   * Example: packages/core/protocols
   */
  packageRoot: string;

  /**
   * Directory with compiled generated definitions.
   * Example: packages/core/protocols/dist/src/proto/gen
   */
  exportFrom: string;
  namespaces: string[];
};

const HEADER = '/**\n * @generated\n */\n';

export const generatePackageExports = ({ packageRoot, exportFrom, namespaces }: GeneratePackageExportsProps) => {
  // TODO(dmaretskyi): Move to config.
  const prefix = 'proto';

  // Clean.
  if (existsSync(join(packageRoot, prefix))) {
    rmdirSync(join(packageRoot, prefix), { recursive: true });
  }

  for (const namespace of namespaces) {
    // Example: packages/core/protocols/proto/dxos/echo/feed
    const filenameWithoutExtension = join(packageRoot, prefix, parseFullyQualifiedName(namespace).join('/'));

    // Example: packages/core/protocols/dist/src/proto/gen/dxos/echo/feed
    const exportedModule = join(exportFrom, parseFullyQualifiedName(namespace).join('/'));

    // Example: ../../../dist/src/proto/gen/dxos/echo/feed
    const moduleRelativeToFile = relative(dirname(filenameWithoutExtension), exportedModule);

    writeFile(`${filenameWithoutExtension}.js`, `${HEADER}\nmodule.exports = require('${moduleRelativeToFile}');\n`);
    writeFile(`${filenameWithoutExtension}.d.ts`, `${HEADER}\nexport * from '${moduleRelativeToFile}';\n`);
  }
};

const writeFile = (path: string, content: string) => {
  if (!existsSync(dirname(path))) {
    mkdirSync(dirname(path), { recursive: true });
  }

  writeFileSync(path, content);
};
