//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type Row,
  categorize,
  digest,
  extractLinks,
  inRange,
  isExpiringLink,
  mergeShared,
  normalizeLink,
  periodRange,
  startOfWeek,
  titleFromLink,
} from './curate.ts';

const MESSAGE_LINK = 'https://discord.com/channels/1/2/3';

describe('extractLinks', () => {
  test('finds every http(s) link once, in order, without the punctuation around it', ({ expect }) => {
    const text = [
      'New demo: https://composer.space/demo/123.',
      'Recording (https://www.loom.com/share/abc) and <https://github.com/dxos/dxos/pull/42>!',
      'Again https://composer.space/demo/123 and [spec](https://docs.google.com/document/d/xyz/edit)',
    ].join('\n');
    expect(extractLinks(text)).toEqual([
      'https://composer.space/demo/123',
      'https://www.loom.com/share/abc',
      'https://github.com/dxos/dxos/pull/42',
      'https://docs.google.com/document/d/xyz/edit',
    ]);
  });

  test('a message with no link shares nothing', ({ expect }) => {
    expect(extractLinks('lunch anyone? ftp://nope and www.example.com')).toEqual([]);
  });
});

describe('normalizeLink', () => {
  test('drops tracking parameters and keeps the rest', ({ expect }) => {
    expect(normalizeLink('https://youtu.be/xyz?si=abc&t=42&utm_source=discord')).toBe('https://youtu.be/xyz?t=42');
  });

  test('leaves text that is not a URL as it is, trimmed', ({ expect }) => {
    expect(normalizeLink('  not a url ')).toBe('not a url');
  });
});

describe('categorize', () => {
  test.for([
    ['https://www.youtube.com/watch?v=1', 'video'],
    ['https://www.loom.com/share/abc', 'video'],
    ['https://github.com/dxos/dxos/releases/download/v1/demo.mp4', 'video'],
    ['https://www.figma.com/file/abc', 'design'],
    ['https://github.com/dxos/dxos/pull/42', 'code'],
    ['https://pkg.pr.new/@dxos/echo@abc', 'code'],
    ['https://docs.google.com/document/d/xyz', 'doc'],
    ['https://example.com/spec.pdf', 'doc'],
    ['https://composer.space/demo/123', 'demo'],
    ['https://main.composer.space', 'demo'],
    ['https://claude.ai/artifact/abc', 'demo'],
    ['http://localhost:5173/', 'demo'],
    ['https://example.com/screenshot.PNG', 'demo'],
    ['https://news.ycombinator.com/item?id=1', 'article'],
    ['https://blog.example.com/post', 'article'],
    ['https://example.com', 'other'],
    ['not a url', 'other'],
  ] as const)('%s is %s', ([link, category], { expect }) => {
    expect(categorize(link)).toBe(category);
  });
});

describe('titleFromLink', () => {
  test('is the host and path, without www or a trailing slash', ({ expect }) => {
    expect(titleFromLink('https://www.github.com/dxos/dxos/pull/42/')).toBe('github.com/dxos/dxos/pull/42');
  });

  test('is cut to fit a table cell', ({ expect }) => {
    const title = titleFromLink(`https://example.com/${'a'.repeat(200)}`);
    expect(title).toHaveLength(80);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('mergeShared', () => {
  test('keeps the model’s title, category and summary on the link they name', ({ expect }) => {
    expect(
      mergeShared('Look https://composer.space/demo/1 and https://github.com/dxos/dxos/pull/2', [
        { url: 'https://github.com/dxos/dxos/pull/2', title: 'Kanban PR', summary: 'Adds drag and drop.' },
      ]),
    ).toEqual([
      { url: 'https://composer.space/demo/1' },
      {
        url: 'https://github.com/dxos/dxos/pull/2',
        title: 'Kanban PR',
        summary: 'Adds drag and drop.',
      },
    ]);
  });

  test('adds the links the model listed that the text does not hold, once', ({ expect }) => {
    expect(
      mergeShared('https://example.com/a', [
        { url: 'https://example.com/b', title: 'B' },
        { url: 'https://example.com/b?utm_source=x' },
      ]).map(({ url }) => url),
    ).toEqual(['https://example.com/a', 'https://example.com/b']);
  });

  test('files the message link once in place of expiring attachment URLs', ({ expect }) => {
    const shared = mergeShared(
      'Demo recording attached',
      [
        { url: 'https://cdn.discordapp.com/attachments/2/9/demo.mp4?ex=1&is=2&hm=3' },
        { url: 'https://cdn.discordapp.com/attachments/2/9/notes.png' },
      ],
      { messageLink: MESSAGE_LINK },
    );
    expect(shared).toEqual([{ url: MESSAGE_LINK, title: 'demo.mp4, notes.png', category: 'video' }]);
  });

  test('drops expiring URLs with no message link to stand in for them', ({ expect }) => {
    expect(mergeShared('https://cdn.discordapp.com/attachments/2/9/demo.mp4')).toEqual([]);
    expect(isExpiringLink('https://media.discordapp.net/attachments/1/2/a.png')).toBe(true);
  });
});

describe('periods', () => {
  // A Wednesday.
  const now = new Date('2026-10-28T15:30:00Z');

  test('weeks start on Monday, UTC', ({ expect }) => {
    expect(startOfWeek(now).toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(startOfWeek(new Date('2026-11-01T23:59:00Z')).toISOString()).toBe('2026-10-26T00:00:00.000Z');
    expect(startOfWeek(new Date('2026-10-26T00:00:00Z')).toISOString()).toBe('2026-10-26T00:00:00.000Z');
  });

  test('each period is a half-open range', ({ expect }) => {
    expect(periodRange('this-week', now)).toEqual({ from: '2026-10-26T00:00:00.000Z', to: '2026-11-02T00:00:00.000Z' });
    expect(periodRange('last-week', now)).toEqual({ from: '2026-10-19T00:00:00.000Z', to: '2026-10-26T00:00:00.000Z' });
    expect(periodRange('this-month', now)).toEqual({
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-11-01T00:00:00.000Z',
    });
    expect(periodRange('all', now)).toEqual({});
  });

  test('a date is in range from its start up to, not including, its end', ({ expect }) => {
    const range = periodRange('this-week', now);
    expect(inRange('2026-10-26T00:00:00Z', range)).toBe(true);
    expect(inRange('2026-10-26T01:00:00+02:00', range)).toBe(false);
    expect(inRange('2026-11-02T00:00:00Z', range)).toBe(false);
    expect(inRange('not a date', {})).toBe(false);
  });
});

describe('digest', () => {
  const row = (overrides: Partial<Row>): Row => ({
    date: '2026-10-27T10:00:00Z',
    author: 'rich',
    link: 'https://composer.space/demo/1',
    title: 'Demo',
    category: 'demo',
    summary: '',
    ...overrides,
  });

  test('groups rows by author, the most active first, each oldest first', ({ expect }) => {
    expect(
      digest([
        row({ author: 'dima', title: 'Agent in Discord', summary: 'Files links.', date: '2026-10-28T09:00:00Z' }),
        row({ author: 'rich', title: 'Kanban', date: '2026-10-28T08:00:00Z' }),
        row({ author: 'rich', title: 'Sheets', category: 'video', date: '2026-10-26T08:00:00Z' }),
      ]),
    ).toBe(
      [
        '**rich** (2)',
        '- 2026-10-26 [Sheets](https://composer.space/demo/1) · video',
        '- 2026-10-28 [Kanban](https://composer.space/demo/1) · demo',
        '',
        '**dima** (1)',
        '- 2026-10-28 [Agent in Discord](https://composer.space/demo/1) · demo — Files links.',
      ].join('\n'),
    );
  });

  test('says when nothing was shared', ({ expect }) => {
    expect(digest([])).toBe('Nothing was shared in this period.');
  });
});
