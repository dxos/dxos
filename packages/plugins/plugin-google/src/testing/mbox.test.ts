//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { joinMbox, splitMbox } from './mbox.ts';

const MBOX = [
  'From MAILER-DAEMON Mon Oct 26 15:54:47 2026',
  'Message-ID: <1@thyme>',
  'Subject: first',
  '',
  'body one',
  '>From the desk of Steven Kean',
  '',
  'From MAILER-DAEMON Mon Oct 26 15:54:47 2026',
  'Message-ID: <2@thyme>',
  'Subject: second',
  '',
  'body two',
  '',
].join('\n');

describe('splitMbox', () => {
  test('returns one raw message per separator, without the separator line', ({ expect }) => {
    const messages = splitMbox(MBOX);
    expect(messages).toHaveLength(2);
    expect(messages[0].startsWith('Message-ID: <1@thyme>\n')).toBe(true);
    expect(messages[1]).toBe('Message-ID: <2@thyme>\nSubject: second\n\nbody two');
  });

  test('unescapes body lines that began with From', ({ expect }) => {
    expect(splitMbox(MBOX)[0].endsWith('\nFrom the desk of Steven Kean')).toBe(true);
  });

  test('reads CRLF files and empty input', ({ expect }) => {
    expect(splitMbox(MBOX.replaceAll('\n', '\r\n'))).toHaveLength(2);
    expect(splitMbox('')).toEqual([]);
  });

  test('reads back what joinMbox writes', ({ expect }) => {
    const messages = ['Subject: a\r\n\r\nFrom the desk\r\n>From a quote', 'Subject: b\n\nbody'];
    expect(splitMbox(joinMbox(messages))).toEqual(['Subject: a\n\nFrom the desk\n>From a quote', 'Subject: b\n\nbody']);
  });
});
