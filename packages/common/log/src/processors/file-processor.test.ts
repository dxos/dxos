//
// Copyright 2026 DXOS.org
//

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { LogLevel } from '../config.ts';
import { createLog } from '../log.ts';
import { createFileProcessor } from './file-processor.ts';

describe('createFileProcessor', () => {
  test('writes the given levels when no filters are set', ({ expect }) => {
    const path = join(mkdtempSync(join(tmpdir(), 'file-processor-')), 'agent.log');
    const log = createLog();
    const remove = log.addProcessor(createFileProcessor({ pathOrFd: path, levels: [LogLevel.INFO, LogLevel.WARN] }));
    try {
      log.debug('skipped');
      log.info('first');
      log.warn('second');
    } finally {
      remove();
    }

    const messages = readFileSync(path, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line).message);
    expect(messages).toEqual(['first', 'second']);
  });

  test('applies filters when they are set', ({ expect }) => {
    const path = join(mkdtempSync(join(tmpdir(), 'file-processor-')), 'agent.log');
    const log = createLog();
    const remove = log.addProcessor(
      createFileProcessor({ pathOrFd: path, levels: [], filters: [{ level: LogLevel.WARN }] }),
    );
    try {
      log.info('skipped');
      log.warn('kept');
    } finally {
      remove();
    }

    expect(
      readFileSync(path, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line).message),
    ).toEqual(['kept']);
  });
});
