//
// Copyright 2026 DXOS.org
//

import { appendFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'vitest';

import { appendPage, isExportFile, readExportFile, resumeFrom } from './export-format.ts';

const message = (id: string) => ({ id, content: `message ${id}`, author: { id: 'u1', name: 'ana' } });
const header = () => ({ guild: { id: 'g1' }, channel: { id: 'c1', name: 'general' } });

describe('export format', () => {
  test('appends pages after a header and reads them back in order', ({ expect }) => {
    const path = join(mkdtempSync(join(tmpdir(), 'export-')), 'c1.jsonl');
    appendPage(path, header, []);
    expect(resumeFrom(path)).toBeUndefined();
    appendPage(path, header, [message('1'), message('2')]);
    appendPage(path, header, [message('3')]);
    const file = readExportFile(path);
    expect(file.channel.id).toBe('c1');
    expect(file.messages.map(({ id }) => id)).toEqual(['1', '2', '3']);
    expect(resumeFrom(path)).toBe('3');
  });

  test('resumes after the last complete line and cuts off a torn write', ({ expect }) => {
    const path = join(mkdtempSync(join(tmpdir(), 'export-')), 'c1.jsonl');
    appendPage(path, header, [message('1'), message('2')]);
    appendFileSync(path, '{"id":"3","conte');
    expect(readExportFile(path).messages).toHaveLength(2);
    expect(resumeFrom(path)).toBe('2');
    appendPage(path, header, [message('3')]);
    expect(readExportFile(path).messages.map(({ id }) => id)).toEqual(['1', '2', '3']);
    expect(readFileSync(path, 'utf8').endsWith('\n')).toBe(true);
  });

  test('reads a DiscordChatExporter JSON document', ({ expect }) => {
    const path = join(mkdtempSync(join(tmpdir(), 'export-')), 'c1.json');
    writeFileSync(path, JSON.stringify({ ...header(), messages: [message('1')] }));
    expect(readExportFile(path).messages[0].id).toBe('1');
  });

  test('recognises channel exports by their id suffix, not every JSON file', ({ expect }) => {
    expect(isExportFile('Cloudflare Developers - general [909458221419356210].jsonl')).toBe(true);
    expect(isExportFile('Effect Community - help [1000].json')).toBe(true);
    expect(isExportFile('channels.json')).toBe(false);
  });
});
