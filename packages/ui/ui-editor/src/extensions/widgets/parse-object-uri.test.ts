//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseObjectUri } from './object-links.ts';

const SPACE = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';
const OBJECT = '01J00J9B45YHYSGZQTQMSKMGJ6';

describe('parseObjectUri', () => {
  test('a qualified object URI is resolvable', ({ expect }) => {
    expect(parseObjectUri(`echo://${SPACE}/${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('both local forms are resolvable, in their original spelling', ({ expect }) => {
    expect(parseObjectUri(`echo:/${OBJECT}`)).toBe(`echo:/${OBJECT}`);
    expect(parseObjectUri(`echo:///${OBJECT}`)).toBe(`echo:///${OBJECT}`);
  });

  // Every prefix of a URI being typed (or streamed) reaches the widget, and resolving one that names
  // no entity throws out of render — which replaced the document's whole plank with an error boundary.
  test('a partial URI is not resolvable', ({ expect }) => {
    const prefixes = [
      'e',
      'ec',
      'echo',
      'echo:',
      'echo:/',
      'echo://',
      'echo:///',
      `echo://${SPACE}`,
      `echo://${SPACE}/`,
    ];
    for (const prefix of prefixes) {
      expect(parseObjectUri(prefix), prefix).toBeUndefined();
    }
  });

  test('a non-object URI is not resolvable', ({ expect }) => {
    expect(parseObjectUri(undefined)).toBeUndefined();
    expect(parseObjectUri('')).toBeUndefined();
    expect(parseObjectUri('https://dxos.org')).toBeUndefined();
    expect(parseObjectUri(`dxn:type:${SPACE}`)).toBeUndefined();
  });
});
