//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { isAbsolute, resolve, relative } from 'path';

/**
 * Represents a reference to a module, either as an relative path with the cwd or as a global module specifier.
 */
export class ModuleSpecifier {
  static resolveFromFilePath(path: string, context: string) {
    // Normalize path.
    const relativePath = relative(context, resolve(context, path));
    const pathWithDot = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;

    return new ModuleSpecifier(pathWithDot, context);
  }

  constructor(public readonly name: string, public readonly contextPath: string) {
    assert(isAbsolute(contextPath));
  }

  isAbsolute() {
    return !this.name.startsWith('.');
  }

  importSpecifier(importContext: string) {
    if (this.isAbsolute()) {
      return this.name;
    } else {
      const relativePath = normalizeRelativePath(relative(importContext, resolve(this.contextPath, this.name)));
      for (const ext of ['.js', '.ts']) {
        if (relativePath.endsWith(ext)) {
          return removeExtension(relativePath, ext);
        }
      }
      return relativePath;
    }
  }

  resolve() {
    return require.resolve(this.name, { paths: [this.contextPath] });
  }
}

export const CODEC_MODULE = new ModuleSpecifier('@dxos/codec-protobuf', __dirname);

const normalizeRelativePath = (path: string) => {
  if (!path.startsWith('.')) {
    return `./${path}`;
  } else {
    return path;
  }
};

const removeExtension = (path: string, extension: string) => {
  if (path.endsWith(extension)) {
    return path.slice(0, -extension.length);
  } else {
    return path;
  }
};
