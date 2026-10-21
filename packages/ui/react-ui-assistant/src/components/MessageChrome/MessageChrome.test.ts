//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { hasOtherAuthors } from './MessageChrome.tsx';

const prompt = (identityDid?: string, name?: string) =>
  Message.make({ sender: { role: 'user', identityDid, name }, blocks: [{ _tag: 'text', text: 'hello' }] });

const answer = () => Message.make({ sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text: 'hi' }] });

describe('hasOtherAuthors', () => {
  test('a thread only the reader wrote in has no other authors', ({ expect }) => {
    expect(hasOtherAuthors([prompt('did:halo:reader'), answer(), prompt('did:halo:reader')], 'did:halo:reader')).toBe(
      false,
    );
  });

  test('a prompt from anyone else is another author', ({ expect }) => {
    expect(hasOtherAuthors([prompt('did:halo:alice'), answer()], 'did:halo:reader')).toBe(true);
  });

  test('a name without a DID is not an author', ({ expect }) => {
    expect(hasOtherAuthors([prompt(undefined, 'Rich'), prompt('did:halo:reader')], 'did:halo:reader')).toBe(false);
  });

  test('without the reader, two distinct DIDs', ({ expect }) => {
    expect(hasOtherAuthors([prompt('did:halo:alice'), prompt('did:halo:alice')])).toBe(false);
    expect(hasOtherAuthors([prompt('did:halo:alice'), prompt('did:halo:bob')])).toBe(true);
  });
});
