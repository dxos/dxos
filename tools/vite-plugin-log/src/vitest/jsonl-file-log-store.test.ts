//
// Copyright 2026 DXOS.org
//

import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';

import { JsonlFileLogStore } from './jsonl-file-log-store';

const makeTempPath = () => join(tmpdir(), `dxos-jsonl-log-store-${randomUUID()}.jsonl`);

let tempPath = makeTempPath();

afterEach(() => {
  rmSync(tempPath, { force: true });
  tempPath = makeTempPath();
});

describe('JsonlFileLogStore', () => {
  test('appends NDJSON lines on flush', () => {
    const store = new JsonlFileLogStore({ path: tempPath });
    store.pushLines(['{"m":"one"}', '{"m":"two"}\n']);
    store.flush();
    store.close();

    const contents = readFileSync(tempPath, 'utf8');
    expect(contents).toBe('{"m":"one"}\n{"m":"two"}\n');
  });

  test('close flushes pending lines', () => {
    const store = new JsonlFileLogStore({ path: tempPath });
    store.pushLine('{"m":"pending"}');
    store.close();

    expect(readFileSync(tempPath, 'utf8')).toBe('{"m":"pending"}\n');
  });
});
