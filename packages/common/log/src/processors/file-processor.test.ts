//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { LogLevel } from '../config.ts';
import { createLog } from '../log.ts';
import { createFileProcessor } from './file-processor.ts';

const openDescriptors = () => readdirSync('/proc/self/fd').length;

describe('createFileProcessor', () => {
  test('writes the listed levels when no filters are given', ({ expect }) => {
    const file = join(mkdtempSync(join(tmpdir(), 'file-processor-')), 'out.log');
    const log = createLog();
    log.addProcessor(createFileProcessor({ pathOrFd: file, levels: [LogLevel.INFO] }));

    log.info('kept', { value: 1 });
    log.warn('dropped');

    const lines = readFileSync(file, 'utf8').trim().split('\n');
    expect(lines.map((line) => JSON.parse(line).message)).toEqual(['kept']);
  });

  test('applies filters when they are given', ({ expect }) => {
    const file = join(mkdtempSync(join(tmpdir(), 'file-processor-')), 'out.log');
    const log = createLog();
    log.addProcessor(
      createFileProcessor({
        pathOrFd: file,
        levels: [LogLevel.INFO],
        filters: [{ level: LogLevel.INFO, pattern: 'no-such-file' }],
      }),
    );

    log.info('dropped');

    expect(() => readFileSync(file, 'utf8')).toThrow();
  });

  test.skipIf(process.platform !== 'linux')('opens the file once', ({ expect }) => {
    const file = join(mkdtempSync(join(tmpdir(), 'file-processor-')), 'out.log');
    const log = createLog();
    log.addProcessor(createFileProcessor({ pathOrFd: file, levels: [LogLevel.INFO] }));

    log.info('first');
    const before = openDescriptors();
    for (let index = 0; index < 50; index++) {
      log.info('entry', { index });
    }

    expect(openDescriptors()).toBe(before);
    expect(readFileSync(file, 'utf8').trim().split('\n')).toHaveLength(51);
  });
});
