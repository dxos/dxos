//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parseObjectUri } from './parse-object-uri.ts';

const SPACE = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';
const OBJECT = '01J00J9B45YHYSGZQTQMSKMGJ6';

describe('parseObjectUri', () => {
  test('a qualified object URI is resolvable', ({ expect }) => {
    expect(parseObjectUri(`echo://${SPACE}/${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('both local forms are resolvable, in their original spelling', ({ expect }) => {
    // The legacy single-slash form is still present in persisted documents; returning it verbatim
    // keeps it resolving against the containing document's own database.
    expect(parseObjectUri(`echo:/${OBJECT}`)).toBe(`echo:/${OBJECT}`);
    expect(parseObjectUri(`echo:///${OBJECT}`)).toBe(`echo:///${OBJECT}`);
  });

  // Every prefix of a URI being typed reaches the embed widget, and resolving one that names no
  // entity throws out of render — which replaced the document's whole plank with an error boundary.
  test('a URI being typed is not resolvable', ({ expect }) => {
    for (const prefix of ['e', 'ec', 'echo', 'echo:', 'echo:/', 'echo://', `echo://${SPACE}`, `echo://${SPACE}/`]) {
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
