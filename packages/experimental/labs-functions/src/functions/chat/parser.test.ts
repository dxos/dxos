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
});
