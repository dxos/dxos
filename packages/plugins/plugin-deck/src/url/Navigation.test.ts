//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { EntityId } from '@dxos/keys';

import * as Navigation from './Navigation.ts';

const table: UrlPath.KeyTable = new Map<string, UrlPath.KeyTableEntry>([
  ['w', { key: 'w', hasId: true, anchor: true }],
  ['companion', { key: 'companion', hasId: true }],
  ['object', { key: 'object', hasId: true }],
  ['home', { key: 'home', hasId: false }],
]);

const WORKSPACE = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';

describe('segments', () => {
  test('a keyed pair round-trips', ({ expect }) => {
    const pair = { key: 'object', id: '01JXYZ', workspace: WORKSPACE };
    expect(Navigation.toSegment(pair)).toBe('object/01JXYZ');
    expect(Navigation.fromSegment('object/01JXYZ', WORKSPACE)).toEqual(pair);
  });

  test('a singleton carries no id', ({ expect }) => {
    expect(Navigation.toSegment({ key: 'home', workspace: WORKSPACE })).toBe('home');
    expect(Navigation.fromSegment('home', WORKSPACE)).toEqual({ key: 'home', workspace: WORKSPACE });
  });

  test('an id containing a slash survives, since only the first separates', ({ expect }) => {
    expect(Navigation.fromSegment('object/a/b', WORKSPACE)).toEqual({ key: 'object', id: 'a/b', workspace: WORKSPACE });
  });
});

describe('the round trip', () => {
  const cases = [
    { name: 'workspace only', pairs: [] },
    { name: 'one plank', pairs: [{ key: 'object', id: '01JXYZ', workspace: WORKSPACE }] },
    {
      name: 'a plank and its companion',
      pairs: [
        { key: 'object', id: '01JXYZ', workspace: WORKSPACE },
        { key: 'companion', id: 'comments', workspace: WORKSPACE },
      ],
    },
    {
      name: 'a singleton between planks',
      pairs: [
        { key: 'home', workspace: WORKSPACE },
        { key: 'object', id: '01JXYZ', workspace: WORKSPACE },
      ],
    },
  ];

  for (const { name, pairs } of cases) {
    test(name, ({ expect }) => {
      const navigation = { workspace: WORKSPACE, pairs };
      const reparsed = Navigation.parse(Navigation.format(navigation), table);
      expect(Option.getOrThrow(reparsed)).toEqual(navigation);
    });
  }
});

const SEPARATOR = '+';

const MAILBOX_ID = EntityId.random();
const MESSAGE_ID = EntityId.random();

describe('getCandidateEntityIds', () => {
  test('a bare object id is its own candidate', ({ expect }) => {
    expect(Navigation.getCandidateEntityIds(MAILBOX_ID, SEPARATOR)).toEqual([MAILBOX_ID]);
  });

  // The object id leads and a view discriminator trails; the tail is `sent`, not an id.
  test('object id first, view discriminator last', ({ expect }) => {
    expect(Navigation.getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}sent`, SEPARATOR)).toEqual([MAILBOX_ID]);
    expect(Navigation.getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}all-mail`, SEPARATOR)).toEqual([MAILBOX_ID]);
  });

  // The mirror image: `…/database/<typeSlug>/<objectId>`.
  test('type slug first, object id last', ({ expect }) => {
    expect(Navigation.getCandidateEntityIds(`example.com-type-Contact${SEPARATOR}${MESSAGE_ID}`, SEPARATOR)).toEqual([
      MESSAGE_ID,
    ]);
  });

  test('keeps every id in a multi-object pair, in order', ({ expect }) => {
    expect(Navigation.getCandidateEntityIds(`${MAILBOX_ID}${SEPARATOR}${MESSAGE_ID}`, SEPARATOR)).toEqual([
      MAILBOX_ID,
      MESSAGE_ID,
    ]);
  });

  test('a pair with no object id at all yields nothing', ({ expect }) => {
    expect(Navigation.getCandidateEntityIds('settings+members', SEPARATOR)).toEqual([]);
  });

  test('does not mistake a space id for an object id', ({ expect }) => {
    expect(Navigation.getCandidateEntityIds('BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE', SEPARATOR)).toEqual([]);
  });
});

describe('getUnresolvedPlankId', () => {
  const WORKSPACE = 'BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE';

  test('a keyed pair', ({ expect }) => {
    expect(Navigation.getUnresolvedPlankId({ key: 'file', id: 'notes.md', workspace: WORKSPACE })).toBe(
      `root/${WORKSPACE}/file/notes.md`,
    );
  });

  test('a singleton pair carries no id segment', ({ expect }) => {
    expect(Navigation.getUnresolvedPlankId({ key: 'home', workspace: WORKSPACE })).toBe(`root/${WORKSPACE}/home`);
  });
});

describe('initialPlanks', () => {
  const doc = { key: 'object', id: '01JXYZ', workspace: WORKSPACE };
  const other = { key: 'object', id: '01JABC', workspace: WORKSPACE };
  const companion = { key: 'companion', id: 'comments', workspace: WORKSPACE };

  test('a pair the caller already resolved opens under that id, so resolution never re-keys it', ({ expect }) => {
    const nodeId = `root/${WORKSPACE}/content/collections/01JXYZ`;
    const idsBySegment = new Map([[Navigation.toSegment(doc), nodeId]]);
    expect(Navigation.initialPlanks([doc, companion], idsBySegment)).toEqual([
      { segment: 'object/01JXYZ', id: nodeId },
    ]);
  });

  test('a pair nothing vouches for opens under a placeholder', ({ expect }) => {
    expect(Navigation.initialPlanks([doc, other], new Map([[Navigation.toSegment(doc), 'resolved']]))).toEqual([
      { segment: 'object/01JXYZ', id: 'resolved' },
      { segment: 'object/01JABC', id: Navigation.getUnresolvedPlankId(other) },
    ]);
  });
});
