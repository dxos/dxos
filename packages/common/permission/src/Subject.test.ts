//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Principal from './Principal.ts';
import * as Requirement from './Requirement.ts';
import * as Subject from './Subject.ts';

const SPACE_ID = 'BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA';

describe('Subject', () => {
  test('covers', ({ expect }) => {
    const space = Subject.space(SPACE_ID);
    const object = Subject.object(SPACE_ID, '01OBJ');
    expect(Subject.covers(Subject.any(), object)).toBe(true);
    expect(Subject.covers(space, object)).toBe(true);
    expect(Subject.covers(object, space)).toBe(false);
    expect(Subject.covers(object, Subject.any())).toBe(false);
    expect(Subject.covers(space, Subject.space('CZ3Q5XYK2TNA7MBPWQ6DRJ4HSE5VGUF2B'))).toBe(false);
    expect(Subject.spaceIdOf(object)).toBe(SPACE_ID);
  });

  test('rejects anything that is not an echo URI', ({ expect }) => {
    expect(() => Subject.make('https://example.com')).toThrow();
    expect(() => Subject.make('echo://lowercase')).toThrow();
  });
});

describe('Principal', () => {
  test('kinds', ({ expect }) => {
    expect(Principal.kind(Principal.identity('did:halo:ABC'))).toBe('identity');
    expect(Principal.kind(Principal.space(SPACE_ID))).toBe('space');
    expect(Principal.kind(Principal.process(`echo://${SPACE_ID}/01PROC`))).toBe('process');
    expect(() => Principal.make('bob')).toThrow();
  });
});

describe('Requirement', () => {
  test('resolves the subject from a string, a ref envelope or an object with @uri', ({ expect }) => {
    const requirement = Requirement.make('/email/send', { subject: Requirement.arg('mailbox') });
    const uri = `echo://${SPACE_ID}/01MAILBOX`;
    expect(Requirement.resolveSubject(requirement, { mailbox: uri })).toBe(uri);
    expect(Requirement.resolveSubject(requirement, { mailbox: { '/': uri } })).toBe(uri);
    expect(Requirement.resolveSubject(requirement, { mailbox: { '@uri': uri } })).toBe(uri);
    expect(() => Requirement.resolveSubject(requirement, { mailbox: 42 })).toThrow();
    expect(Requirement.resolveSubject(Requirement.make('/sandbox/exec'), {})).toBe('*');
  });
});
