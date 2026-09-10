//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EntityId } from '@dxos/keys';

import { getCandidateEntityIds, getUnresolvedPlankId } from './navigation-target';

const SEPARATOR = '+';

const MAILBOX_ID = EntityId.random();
const MESSAGE_ID = EntityId.random();

describe('getCandidateEntityIds', () => {
  test('a bare object id is its own candidate', ({ expect }) => {
    expect(getCandidateEntityIds(MAILBOX_ID, SEPARATOR)).toEqual([MAILBOX_ID]);
  });

  // The object id leads and a view discriminator trails; the tail is `sent`, not an id.
  test('object id first, view discriminator last', ({ expect }) => {
    expect(getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}sent`, SEPARATOR)).toEqual([MAILBOX_ID]);
    expect(getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}all-mail`, SEPARATOR)).toEqual([MAILBOX_ID]);
  });

  // The mirror image: `…/database/<typeSlug>/<objectId>`.
  test('type slug first, object id last', ({ expect }) => {
    expect(getCandidateEntityIds(`example.com-type-Contact${SEPARATOR}${MESSAGE_ID}`, SEPARATOR)).toEqual([MESSAGE_ID]);
  });

  test('keeps every id in a multi-object pair, in order', ({ expect }) => {
    expect(getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}${MESSAGE_ID}`, SEPARATOR)).toEqual([
      MAILBOX_ID,
      MESSAGE_ID,
    ]);
  });

  test('a pair with no object id at all yields nothing', ({ expect }) => {
    expect(getCandidateEntityIds('settings+members', SEPARATOR)).toEqual([]);
  });

  test('does not mistake a space id for an object id', ({ expect }) => {
    expect(getCandidateEntityIds('BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE', SEPARATOR)).toEqual([]);
  });
});

describe('getUnresolvedPlankId', () => {
  const WORKSPACE = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';

  test('a keyed pair', ({ expect }) => {
    expect(getUnresolvedPlankId({ key: 'file', id: 'notes.md', workspace: WORKSPACE })).toBe(
      `root/${WORKSPACE}/file/notes.md`,
    );
  });

  test('a singleton pair carries no id segment', ({ expect }) => {
    expect(getUnresolvedPlankId({ key: 'home', workspace: WORKSPACE })).toBe(`root/${WORKSPACE}/home`);
  });
});
