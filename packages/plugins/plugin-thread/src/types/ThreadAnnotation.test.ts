//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import * as ThreadAnnotation from './ThreadAnnotation';

const makeMessage = () => Message.make({ sender: { role: 'user' }, blocks: [{ _tag: 'text', text: 'root' }] });

describe('ThreadAnnotation', () => {
  test('a message roots no thread until named', ({ expect }) => {
    const message = makeMessage();
    expect(ThreadAnnotation.getThread(message)).to.be.undefined;
    expect(ThreadAnnotation.getName(message)).to.be.undefined;
  });

  test('setName stores the name in the thread annotation', ({ expect }) => {
    const message = makeMessage();
    ThreadAnnotation.setName(message, 'Q2 planning');
    expect(ThreadAnnotation.getName(message)).to.eq('Q2 planning');
    expect(ThreadAnnotation.getThread(message)).to.deep.eq({ name: 'Q2 planning' });
  });

  test('setName replaces an existing name', ({ expect }) => {
    const message = makeMessage();
    ThreadAnnotation.setName(message, 'First');
    ThreadAnnotation.setName(message, 'Second');
    expect(ThreadAnnotation.getName(message)).to.eq('Second');
  });

  // Clearing the last populated field drops the annotation rather than leaving an empty struct on
  // every message that ever had a name.
  test('clearing the name removes the annotation', ({ expect }) => {
    const message = makeMessage();
    ThreadAnnotation.setName(message, 'Q2 planning');
    ThreadAnnotation.setName(message, undefined);
    expect(ThreadAnnotation.getThread(message)).to.be.undefined;
    expect(ThreadAnnotation.Thread.key in Obj.getMeta(message).annotations).to.be.false;
  });

  test('an empty name clears rather than storing a blank', ({ expect }) => {
    const message = makeMessage();
    ThreadAnnotation.setName(message, 'Q2 planning');
    ThreadAnnotation.setName(message, '');
    expect(ThreadAnnotation.getName(message)).to.be.undefined;
  });

  // The annotation lives on entity meta, which the feed codec carries with the object.
  test('the annotation is stored on the message meta', ({ expect }) => {
    const message = makeMessage();
    ThreadAnnotation.setName(message, 'Q2 planning');
    expect(Obj.getMeta(message).annotations[ThreadAnnotation.Thread.key]).to.deep.eq({ name: 'Q2 planning' });
  });
});
