//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { MAX_FILE_SIZE } from '../types';
import createHandler, { FileTooLargeError, UnsupportedFileTypeError } from './create';

const makeFile = (name: string, type: string, bytes: Uint8Array): File => new File([bytes as BlobPart], name, { type });

describe('FileOperation.Create', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const invoke = async (db: any, file: File) =>
    createHandler.handler({ file, db }).pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

  test('creates a FileType object for a small PNG', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = makeFile('icon.png', 'image/png', bytes);

    const { object } = await invoke(db, file);
    expect(object.name).toBe('icon.png');
    expect(object.type).toBe('image/png');
    expect(object.size).toBe(bytes.byteLength);
    expect(object.data).toBeInstanceOf(Uint8Array);
    expect(object.data.byteLength).toBe(bytes.byteLength);
  });

  test('creates a FileType object for a PDF', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const file = makeFile('doc.pdf', 'application/pdf', new Uint8Array(1024));

    const { object } = await invoke(db, file);
    expect(object.type).toBe('application/pdf');
    expect(object.size).toBe(1024);
  });

  test('rejects files larger than 4MB', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const oversized = new Uint8Array(MAX_FILE_SIZE + 1);
    const file = makeFile('big.png', 'image/png', oversized);

    await expect(invoke(db, file)).rejects.toThrow(FileTooLargeError);
  });

  test('rejects non-image / non-PDF MIME types', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const file = makeFile('movie.mp4', 'video/mp4', new Uint8Array(8));

    await expect(invoke(db, file)).rejects.toThrow(UnsupportedFileTypeError);
  });

  test('rejects text/plain', async ({ expect }) => {
    const { db } = await builder.createDatabase();
    const file = makeFile('notes.txt', 'text/plain', new Uint8Array(8));

    await expect(invoke(db, file)).rejects.toThrow(UnsupportedFileTypeError);
  });
});
