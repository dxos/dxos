//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EntityId } from '@dxos/keys';

import { combineVerdicts, getCandidateEntityIds } from './navigation-target';

const SEPARATOR = '+';

const MAILBOX_ID = EntityId.random();
const MESSAGE_ID = EntityId.random();

describe('getCandidateEntityIds', () => {
  test('a bare object id is its own candidate', ({ expect }) => {
    expect(getCandidateEntityIds(MAILBOX_ID, SEPARATOR)).toEqual([MAILBOX_ID]);
  });

  // `…/mailboxes/<mailboxId>/sent` — the object id leads and a view discriminator trails. Taking
  // the segment after the last separator yields `sent`, which is what fell the plank to not-found.
  test('object id first, view discriminator last', ({ expect }) => {
    expect(getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}sent`, SEPARATOR)).toEqual([MAILBOX_ID]);
    expect(getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}all-mail`, SEPARATOR)).toEqual([MAILBOX_ID]);
  });

  // `…/database/<typeSlug>/<objectId>` — the mirror image, which the previous tail heuristic handled.
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

  // A SpaceId is 33-char multibase, an EntityId a 26-char ULID, so a workspace segment can never be
  // mistaken for an object id.
  test('does not mistake a space id for an object id', ({ expect }) => {
    expect(getCandidateEntityIds('BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE', SEPARATOR)).toEqual([]);
  });
});

describe('combineVerdicts', () => {
  test('one store saying yes settles it', ({ expect }) => {
    expect(combineVerdicts(['absent', 'exists'])).toBe('exists');
    expect(combineVerdicts(['unknown', 'exists'])).toBe('exists');
  });

  test('absent requires unanimity', ({ expect }) => {
    expect(combineVerdicts(['absent'])).toBe('absent');
    expect(combineVerdicts(['absent', 'absent'])).toBe('absent');
  });

  // The regression this whole change exists for: an unanswered question must not read as a deletion,
  // because `absent` is the one verdict that revokes the caller's wait.
  test('a single unknown blocks absent', ({ expect }) => {
    expect(combineVerdicts(['absent', 'unknown'])).toBe('unknown');
  });

  test('nothing to ask is unknown, not absent', ({ expect }) => {
    expect(combineVerdicts([])).toBe('unknown');
  });
});
