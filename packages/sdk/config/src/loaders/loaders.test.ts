//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { InvalidConfigError } from '@dxos/protocols';

import { FILE_DEFAULTS } from '../types';
import { Defaults } from './index';

const basePaths: string[] = [];

describe('config loaders', () => {
  afterEach(() => {
    basePaths.splice(0).forEach((basePath) => fs.rmSync(basePath, { recursive: true, force: true }));
  });

  test('an absent file is not an error', ({ expect }) => {
    expect(Defaults(withBasePath())).toEqual({});
  });

  test('a well-formed file loads', ({ expect }) => {
    const config = Defaults(withBasePath('version: 1\nruntime:\n  app:\n    theme: dark\n'));
    expect(config.runtime?.app?.theme).toBe('dark');
  });

  test('malformed YAML raises InvalidConfigError', ({ expect }) => {
    expect(() => Defaults(withBasePath('runtime: ['))).toThrow(InvalidConfigError);
  });

  test('a schema-invalid file raises InvalidConfigError', ({ expect }) => {
    expect(() => Defaults(withBasePath('version: not-a-number\n'))).toThrow(InvalidConfigError);
  });
});

const withBasePath = (contents?: string): string => {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dxos-config-'));
  basePaths.push(basePath);
  if (contents !== undefined) {
    fs.writeFileSync(path.join(basePath, FILE_DEFAULTS), contents);
  }
  return basePath;
};
