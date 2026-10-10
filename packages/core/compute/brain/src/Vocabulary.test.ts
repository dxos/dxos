//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Predicate } from '@dxos/pipeline-rdf/types';

import * as Vocabulary from './Vocabulary.ts';

describe('Vocabulary', () => {
  test('normalize applies the fact store relation key before joining words', ({ expect }) => {
    for (const surface of ['works at', 'Works At', 'is working at', 'worked-at', 'works_at']) {
      expect(Vocabulary.normalize(surface)).toBe(Predicate.normalize('works at').replace(/\s+/g, '_'));
    }
    expect(Vocabulary.normalize('Will-Work-On')).toBe(Vocabulary.normalize('working on'));
    expect(Vocabulary.normalize(Vocabulary.normalize('is helping with'))).toBe(Vocabulary.normalize('is helping with'));
  });

  test('canonicalizes inflected and auxiliary surface forms', ({ expect }) => {
    const vocabulary = Vocabulary.make(Vocabulary.DEFAULT_ENTRIES);
    expect(vocabulary.canonical('works_on')).toBe('works_on');
    expect(vocabulary.canonical('is working on')).toBe('works_on');
    expect(vocabulary.canonical('worked on')).toBe('works_on');
    expect(vocabulary.canonical('Helped-With')).toBe('helps_with');
    expect(vocabulary.canonical('was finished')).toBe('completed');
    expect(vocabulary.resolve('is waiting for')).toBe('awaiting');
    expect(vocabulary.resolve('hates')).toBe('hates');
  });

  test('keeps synonyms that differ beyond inflection distinct', ({ expect }) => {
    const vocabulary = Vocabulary.make([
      { predicate: 'works_at', synonyms: ['employed by'] },
      { predicate: 'works_for' },
    ]);
    expect(vocabulary.canonical('is employed by')).toBe('works_at');
    expect(vocabulary.canonical('working for')).toBe('works_for');
  });

  test('rejects synonyms that collapse onto two canonical predicates', ({ expect }) => {
    expect(() =>
      Vocabulary.make([
        { predicate: 'likes', synonyms: ['is fond of'] },
        { predicate: 'loves', synonyms: ['fond of'] },
      ]),
    ).toThrow(/maps to both/);
  });
});
