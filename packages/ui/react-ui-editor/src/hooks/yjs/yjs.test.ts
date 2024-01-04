//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-react';
import { expect } from 'chai';
import * as Y from 'yjs';

import { Trigger } from '@dxos/async';
import { Expando, TextObject } from '@dxos/echo-schema';
import { registerSignalFactory } from '@dxos/echo-signals';
import { describe, test } from '@dxos/test';
import { type YText } from '@dxos/text-model';

describe('YJS', () => {
  // https://docs.yjs.dev/api/shared-types/y.text
  // https://github.com/yjs/yjs?tab=readme-ov-file#relative-positions
  test('absolute position', () => {
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

  // TODO(burdon): Test deleting end character.

  test('splat', async () => {
    registerSignalFactory();
    const obj = new Expando({ comments: {} });

    const trigger = new Trigger();
    effect(() => {
      console.log(obj.comments);
      if (obj.comments.message) {
        trigger.wake();
      }
    });

    obj.comments = { message: 'hello' };
    await trigger.wait();
  });
});
