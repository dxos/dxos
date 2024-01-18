//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import * as Y from 'yjs';

import { TextObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';
import { type YText } from '@dxos/text-model';

describe('YJS', () => {
  // https://docs.yjs.dev/api/shared-types/y.text
  // https://github.com/yjs/yjs?tab=readme-ov-file#relative-positions
  test.skip('absolute position', () => {
    const obj = new TextObject('hello world');
    const index = obj.text.indexOf('world');
    const relPos = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(obj.content as YText, index));

    {
      const cursor = Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(relPos), obj.doc!);
      expect(cursor!.index).to.equal(index);
      expect(obj.text.substring(cursor!.index)).to.equal('world');
    }

    (obj.content as YText).insert(index, 'cruel ');
    expect(obj.text).to.equal('hello cruel world');

    {
      const cursor = Y.createAbsolutePositionFromRelativePosition(Y.decodeRelativePosition(relPos), obj.doc!);
      expect(cursor!.index).not.to.equal(index);
      expect(obj.text.substring(cursor!.index)).to.equal('world');
    }
  });
});
