//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { CORPUS } from './corpus.ts';
import * as Generator from './Generator.ts';

describe('Generator', () => {
  test('the actors together send the corpus in order', ({ expect }) => {
    const generators = Generator.makeAll();
    const sent: string[] = [];
    for (let entry = Generator.next(generators)?.take(); entry; entry = Generator.next(generators)?.take()) {
      sent.push(entry.key);
    }
    expect(sent).toEqual(CORPUS.map((message) => message.key));
  });

  test('counts what its own generators have yet to send', ({ expect }) => {
    const generators = Generator.makeAll();
    expect(Generator.remaining(generators)).toBe(CORPUS.length);
    Generator.next(generators)?.take();
    expect(Generator.remaining(generators)).toBe(CORPUS.length - 1);
    while (Generator.next(generators)?.take()) {}
    expect(Generator.remaining(generators)).toBe(0);
  });

  test('a generator over part of the corpus counts only that part', ({ expect }) => {
    const generators = Generator.makeAll(CORPUS.slice(0, 1));
    expect(Generator.remaining(generators)).toBe(1);
    expect(Generator.next(generators)?.take()?.key).toBe(CORPUS[0].key);
    expect(Generator.next(generators)).toBeUndefined();
    expect(generators[0].take()).toBeUndefined();
    expect(Generator.remaining(generators)).toBe(0);
  });
});
