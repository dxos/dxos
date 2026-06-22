//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type RefOption } from '#types';

import { findRefOption } from './RefField';

// Sample qualified self URIs as produced by an in-space object (Entity.getURI / `echo://<space>/<id>`).
const SPACE_ID = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';
const ENTITY_ID = '01J00J9B45YHYSGZQTQMSKMGJ6';
const QUALIFIED = `echo://${SPACE_ID}/${ENTITY_ID}`;
const LOCAL = `echo:/${ENTITY_ID}`;

const options: RefOption[] = [
  { id: QUALIFIED, label: 'Target' },
  { id: 'echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/01J00OTHER0000000000000000', label: 'Other' },
];

describe('findRefOption', () => {
  test('matches an exact qualified ref', ({ expect }) => {
    expect(findRefOption({ '/': QUALIFIED }, options)?.label).toBe('Target');
  });

  test('matches a bare local ref against a qualified option by entity id', ({ expect }) => {
    // `Ref.make` yields the local form; the option is keyed by the qualified self URI.
    expect(findRefOption({ '/': LOCAL }, options)?.label).toBe('Target');
  });

  test('matches a keyed-entity ref by direct URI equality', ({ expect }) => {
    // Keyed/registry entities (skills, operations) are referenced by a named DXN with no parseable
    // EID; the option id and the ref uri are the same named URI, so they match by direct equality.
    const named = 'dxn:type:example.com/skill/research';
    const keyedOptions: RefOption[] = [...options, { id: named, label: 'Research' }];
    expect(findRefOption({ '/': named }, keyedOptions)?.label).toBe('Research');
  });

  test('returns undefined for a non-ref value', ({ expect }) => {
    expect(findRefOption('not-a-ref', options)).toBeUndefined();
    expect(findRefOption(undefined, options)).toBeUndefined();
  });

  test('returns undefined when no option matches', ({ expect }) => {
    expect(findRefOption({ '/': 'echo:/01J00MISSING0000000000000000' }, options)).toBeUndefined();
  });

  test('does not match a qualified ref against a same-entity-id option from a different space', ({ expect }) => {
    // The entity id coincides but the space authority differs; ids are only unique within a space.
    const otherSpace = `echo://BZ25QRC2FEWCSAMRP4RZL65LWJ7352CKE/${ENTITY_ID}`;
    expect(findRefOption({ '/': otherSpace }, options)).toBeUndefined();
  });
});
