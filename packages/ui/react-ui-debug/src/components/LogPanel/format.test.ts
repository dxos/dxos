//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LogEntry, LogLevel } from '@dxos/log';

import { formatLogEntry } from './format';

describe('formatLogEntry', () => {
  test('extracts level letter, file basename, message and context', () => {
    const entry = new LogEntry({
      level: LogLevel.INFO,
      message: 'hello',
      context: { count: 3 },
      meta: { F: '/repo/packages/foo/src/bar.ts', L: 42, S: undefined },
      timestamp: 0,
    });

    const record = formatLogEntry(entry);
    expect(record.level).to.equal('I');
    expect(record.file).to.equal('bar.ts');
    expect(record.line).to.equal(42);
    expect(record.message).to.equal('hello');
    expect(record.context).to.deep.equal({ count: 3 });
    expect(record.error).to.be.undefined;
  });

  test('omits empty context', () => {
    const entry = new LogEntry({ level: LogLevel.DEBUG, message: 'x', context: {}, timestamp: 0 });
    expect(formatLogEntry(entry).context).to.be.undefined;
  });
});
