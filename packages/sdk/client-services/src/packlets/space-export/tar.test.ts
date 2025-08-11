//
// Copyright 2025 DXOS.org
//

import { Archive } from '@obsidize/tar-browserify';
import { describe, expect, it } from 'vitest';

describe('tar', () => {
  it('should create a tar archive', async () => {
    const archive = new Archive();

    archive.addTextFile('test.txt', 'Hello, world!');
    archive.addTextFile('dir/test.txt', 'Hello, world!');

    const bytes = await archive.toUint8Array();

    const unpackaged = await Archive.extract(bytes);

    expect(unpackaged.entries[0].fileName).toBe('test.txt');
    expect(unpackaged.entries[0].getContentAsText()).toBe('Hello, world!');

    expect(unpackaged.entries[1].fileName).toBe('dir/test.txt');
    expect(unpackaged.entries[1].getContentAsText()).toBe('Hello, world!');
  });
});
