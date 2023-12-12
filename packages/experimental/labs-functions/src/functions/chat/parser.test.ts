//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { parseMessage } from './parser';

describe('Parser', () => {
  test('JSON text', () => {
    const data = [
      { name: 'DXOS', url: 'https://dxos.org' },
      { name: 'Braneframe, Inc.', url: 'https://braneframe.com' },
      { name: 'Blue Yard', url: 'https://blueyard.com' },
    ];

    const formatJson = (data: any) => '```json\n' + JSON.stringify(data, undefined, 2) + '\n```';

    const content = [
      "Here's an example of a JSON document listing\n the founders of Blue Yard:",
      formatJson(data),
      'Please note that this is just an example and may not reflect the current or complete list of founders for Blue Yard.',
    ].join('\n');

    const result = parseMessage(content, 'json');
    expect(result?.data).to.have.length(data.length);
  });

  test('mermaid', () => {
    const content = ['```mermaid', 'graph LR', 'A[Square Rect] -- Link text --> B((Circle))', '```'];

    const result = parseMessage(content.join('\n'));
    expect(result?.content.indexOf('graph')).to.eq(0);
    expect(result?.content).to.deep.eq([...content.slice(1, 3), ''].join('\n'));
  });

  test('embedded', () => {
    const content =
      '```Below is an example of such a representation in Mermaid syntax for a simple three-generation family tree. ' +
      '\n' +
      '```mermaid\n' +
      'graph TD\n' +
      '    QueenElizabethII(Queen Elizabeth II) --> CharlesIII(Charles III)\n' +
      '    QueenElizabethII --> Anne(Anne, Princess Royal)\n' +
      '    QueenElizabethII --> PrinceAndrew(Prince Andrew, Duke of York)\n' +
      '    QueenElizabethII --> PrinceEdward(Prince Edward, Earl of Wessex)\n' +
      '\n' +
      '    CharlesIII --> William(Prince William, Duke of Cambridge)\n' +
      '    CharlesIII --> Harry(Prince Harry, Duke of Sussex)\n' +
      '\n' +
      '    William --> George(Prince George of Cambridge)\n' +
      '    William --> Charlotte(Princess Charlotte of Cambridge)\n' +
      '    William --> Louis(Prince Louis of Cambridge)\n' +
      '```\n' +
      '\n' +
      'When this text is rendered by a Mermaid-compatible viewer';

    const result = parseMessage(content);
    expect(result?.content.indexOf('graph')).to.eq(0);
  });
});
