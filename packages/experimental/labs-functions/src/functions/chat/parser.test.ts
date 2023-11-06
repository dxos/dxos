//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { parseMessage } from './parser';

describe('Parser', () => {
  test.skip('JSON text', () => {
    // TODO(burdon): Multiple JSON blocks.
    const content =
      "Certainly! Here's an example of a JSON document listing\n the founders of Blue Yard:" +
      ' ```json { "founders": [ { "name": "Ciarán O\'Leary", "role": "General Partner" }, { "name": "Jason Whitmire", "role": "General Partner" } ] } ``` Please note that this is just an example and may not reflect the current or complete list of founders for Blue Yard.\n';

    const result = parseMessage(content, 'json');
    expect(result?.data).to.exist;
    expect(result?.data.founders).to.have.length(2);
  });
});
