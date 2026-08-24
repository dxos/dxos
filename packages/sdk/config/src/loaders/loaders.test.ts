//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'vitest';

import { InvalidConfigError } from '@dxos/protocols';

import { FILE_DEFAULTS } from '../types';
import { Defaults } from './index';

const withBasePath = (contents?: string): string => {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dxos-config-'));
  if (contents !== undefined) {
    fs.writeFileSync(path.join(basePath, FILE_DEFAULTS), contents);
  }
  return basePath;
};

describe('config loaders', () => {
  test('an absent file is not an error', ({ expect }) => {
    expect(Defaults(withBasePath())).toEqual({});
  });

  test('a well-formed file loads', ({ expect }) => {
    const config = Defaults(withBasePath('version: 1\nruntime:\n  app:\n    theme: dark\n'));
    expect(config.runtime?.app?.theme).toBe('dark');
  });

  // Malformed YAML used to be swallowed as an absent file, so the config it supplied vanished.
  test('malformed YAML is surfaced rather than treated as absent', ({ expect }) => {
    expect(() => Defaults(withBasePath('runtime: ['))).toThrow(InvalidConfigError);
  });

  test('a schema-invalid file is surfaced', ({ expect }) => {
    expect(() => Defaults(withBasePath('version: not-a-number\n'))).toThrow(InvalidConfigError);
  });
});
