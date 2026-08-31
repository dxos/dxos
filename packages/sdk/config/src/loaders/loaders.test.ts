//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, test } from 'vitest';

import { InvalidConfigError } from '@dxos/protocols';

import { FILE_DEFAULTS, FILE_ENVS } from '../types';
import { Defaults, Envs } from './index';

const basePaths: string[] = [];

describe('config loaders', () => {
  afterEach(() => {
    basePaths.splice(0).forEach((basePath) => fs.rmSync(basePath, { recursive: true, force: true }));
    delete process.env.DX_TEST_JSON;
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

  test('a malformed json env entry is reported against its source', ({ expect }) => {
    process.env.DX_TEST_JSON = '{ not json';
    const basePath = withEnvsMap('DX_TEST_JSON:\n  path: runtime.app.env.DX_TEST_JSON\n  type: json\n');
    // Naming the source is the point of the projection's own error boundary, so assert on it.
    expect(() => Envs(basePath)).toThrow(InvalidConfigError);
    expect(() => Envs(basePath)).toThrow(FILE_ENVS);
  });
});

const withEnvsMap = (contents: string): string => {
  const basePath = makeBasePath();
  fs.writeFileSync(path.join(basePath, FILE_ENVS), contents);
  return basePath;
};

const withBasePath = (contents?: string): string => {
  const basePath = makeBasePath();
  if (contents !== undefined) {
    fs.writeFileSync(path.join(basePath, FILE_DEFAULTS), contents);
  }
  return basePath;
};

const makeBasePath = (): string => {
  const basePath = fs.mkdtempSync(path.join(os.tmpdir(), 'dxos-config-'));
  basePaths.push(basePath);
  return basePath;
};
