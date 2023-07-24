//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

describe('parsing', () => {
  test('JSON text', () => {
    const content =
      'Certainly! Here\'s an example of a JSON document listing\n the founders of Blue Yard: ```json { "founders": [ { "name": "Ciarán O\'Leary", "role": "General Partner" }, { "name": "Jason Whitmire", "role": "General Partner" }, { "name": "Cyril Bertrand", "role": "Venture Partner" }, { "name": "Christoph Janz", "role": "Venture Partner" } ] } ``` Please note that this is just an example and may not reflect the current or complete list of founders for Blue Yard.\n';

    const text = content.replace(/\n/, '');
    const match = text.match(/(.+)?```json(.+)```(.+)/g);
    console.log('>>>', match);

    expect(match).to.exist;
  });
});
