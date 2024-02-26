//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

describe('Scratchpad', () => {
  test.skip('am object identity', () => {
    const doc1 = A.from({
      obj: { prop: 'foo' },
      field: 0,
    });

    const doc2 = A.change(doc1, (doc) => {
      doc.field = 42;
    });

    const doc3 = A.change(doc2, (doc) => {
      doc.obj.prop = 'bar';
    });

    const doc4 = A.change(doc3, (doc) => {
      doc.obj = { prop: 'baz' };
    });

    log.info('ids', {
      doc1: A.getObjectId(doc1, 'obj'),
      doc2: A.getObjectId(doc2, 'obj'),
      doc3: A.getObjectId(doc3, 'obj'),
      doc4: A.getObjectId(doc4, 'obj'),
    });

    log.info('ids 2', {
      doc1: A.getObjectId(doc1.obj),
      doc2: A.getObjectId(doc2.obj),
      doc3: A.getObjectId(doc3.obj),
      doc4: A.getObjectId(doc4.obj),
    });

    expect(doc1.obj === doc2.obj).to.be.true;
    expect(doc1.obj === doc3.obj).to.be.true;
    expect(doc1.obj === doc4.obj).to.be.false;
  });
});
