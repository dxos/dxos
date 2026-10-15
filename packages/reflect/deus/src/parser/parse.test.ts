//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseMdl } from './parse.ts';

const FLOW = [
  'flow F-1: From phone to cloud   # demo',
  '  seed: 7',
  '  desc: |',
  '    Line one',
  '',
  '    Line two',
  '  steps:',
  '    - name: Close up',
  '      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 2s }',
  '      caption: A message is typed on the phone',
  '    # a comment between steps',
  '    - name: Top view',
  '      with: previous',
  '      show:',
  "        - { target: 'ring-*', stagger: 200ms }",
  '        - cloud',
  '  tags: [demo, network]',
].join('\n');

describe('parseMdl', () => {
  test('parses a block with nested steps', ({ expect }) => {
    expect(parseMdl(FLOW)).toEqual([
      {
        type: 'flow',
        id: 'F-1',
        title: 'From phone to cloud',
        line: 0,
        fields: {
          seed: 7,
          desc: 'Line one\n\nLine two',
          steps: [
            {
              name: 'Close up',
              camera: { view: 'iso', focus: 'home/phone', zoom: 2.5, over: '2s' },
              caption: 'A message is typed on the phone',
            },
            { name: 'Top view', with: 'previous', show: [{ target: 'ring-*', stagger: '200ms' }, 'cloud'] },
          ],
          tags: ['demo', 'network'],
        },
      },
    ]);
  });

  test('nested maps, prose lists, several blocks, CRLF', ({ expect }) => {
    const source = [
      'test S-1',
      '  given:',
      '    - space: a space is open',
      '    - an identity exists',
      'ext b',
      '  network:',
      '    kind: cloud',
      '    count: 3',
    ].join('\r\n');
    expect(parseMdl(source)).toEqual([
      { type: 'test', id: 'S-1', line: 0, fields: { given: [{ space: 'a space is open' }, 'an identity exists'] } },
      { type: 'ext', id: 'b', line: 4, fields: { network: { kind: 'cloud', count: 3 } } },
    ]);
  });

  test('reads blocks from markdown fences', ({ expect }) => {
    const markdown = [
      '# Title',
      '',
      '```mdl',
      'ext a',
      '  uri: x',
      '```',
      '',
      'text',
      '```mdl',
      'suite S-1',
      '  tests: [QA-1]',
      '```',
    ].join('\n');
    expect(parseMdl(markdown)).toEqual([
      { type: 'ext', id: 'a', line: 3, fields: { uri: 'x' } },
      { type: 'suite', id: 'S-1', line: 9, fields: { tests: ['QA-1'] } },
    ]);
  });

  test('reports the line of indentation and duplicate errors', ({ expect }) => {
    expect(() => parseMdl(['flow F-1', '  steps:', '    - name: a', '       bad: x'].join('\n'))).toThrow(
      /Unexpected indentation \(line 4\)/,
    );
    expect(() => parseMdl(['flow F-1', '  seed: 1', '  seed: 2'].join('\n'))).toThrow(
      /Duplicate field "seed" \(line 3\)/,
    );
    expect(() => parseMdl('  orphan: 1')).toThrow(/column 0/);
    expect(() => parseMdl(['flow F-1', '  send: { from: a, color: #5f8fae }'].join('\n'))).toThrow(
      /"#" starts a comment, so quote values that contain it \(line 2\)/,
    );
  });
});
