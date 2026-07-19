//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as UrlPath from './UrlPath';

const table: UrlPath.KeyTable = new Map<string, UrlPath.KeyTableEntry>([
  ['doc', { key: 'doc', hasId: true }],
  ['sheet', { key: 'sheet', hasId: true }],
  ['task', { key: 'task', hasId: true }],
  ['comments', { key: 'comments', hasId: false }],
]);

const WORKSPACE_A = 'B2AKworkspaceA';
const WORKSPACE_B = 'C7QPworkspaceB';

describe('UrlPath', () => {
  describe('parse', () => {
    test('workspace-only path', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}`, table);
      expect(Option.isSome(parsed)).toBe(true);
      expect(Option.getOrThrow(parsed)).toEqual({ workspace: WORKSPACE_A, pairs: [] });
    });

    test('tokenizes a single pair', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/01JGDOC`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        pairs: [{ key: 'doc', id: '01JGDOC', workspace: WORKSPACE_A }],
      });
    });

    test('tokenizes a chain of pairs', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/sheet/B`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'sheet', id: 'B', workspace: WORKSPACE_A },
        ],
      });
    });

    test('id-less companion keys consume no id segment', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/comments`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'comments', workspace: WORKSPACE_A },
        ],
      });
    });

    test('mid-chain w pair rebases subsequent ids', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/w/${WORKSPACE_B}/task/B`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'task', id: 'B', workspace: WORKSPACE_B },
        ],
      });
    });

    test('pinned workspace names', ({ expect }) => {
      const parsed = UrlPath.parse('/w/!dxos:settings/doc/A', table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: '!dxos:settings',
        pairs: [{ key: 'doc', id: 'A', workspace: '!dxos:settings' }],
      });
    });

    test('unknown key resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/bogus/A`, table);
      expect(Option.isNone(parsed)).toBe(true);
    });

    test('hasId key missing its id resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc`, table);
      expect(Option.isNone(parsed)).toBe(true);
    });

    test('dangling w with no following workspace resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/w`, table);
      expect(Option.isNone(parsed)).toBe(true);
    });

    test('missing leading w resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse(`/${WORKSPACE_A}/doc/A`, table);
      expect(Option.isNone(parsed)).toBe(true);
    });

    test('missing workspace after leading w resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse('/w', table);
      expect(Option.isNone(parsed)).toBe(true);
    });
  });

  describe('format', () => {
    test('emits workspace-only path', ({ expect }) => {
      expect(UrlPath.format({ workspace: WORKSPACE_A, pairs: [] })).toBe(`/w/${WORKSPACE_A}`);
    });

    test('emits a single pair', ({ expect }) => {
      expect(
        UrlPath.format({
          workspace: WORKSPACE_A,
          pairs: [{ key: 'doc', id: 'A', workspace: WORKSPACE_A }],
        }),
      ).toBe(`/w/${WORKSPACE_A}/doc/A`);
    });

    test('emits an id-less companion pair', ({ expect }) => {
      expect(
        UrlPath.format({
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'A', workspace: WORKSPACE_A },
            { key: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      ).toBe(`/w/${WORKSPACE_A}/doc/A/comments`);
    });

    test('inserts a w pair on workspace change', ({ expect }) => {
      expect(
        UrlPath.format({
          workspace: WORKSPACE_A,
          pairs: [
            { key: 'doc', id: 'A', workspace: WORKSPACE_A },
            { key: 'task', id: 'B', workspace: WORKSPACE_B },
          ],
        }),
      ).toBe(`/w/${WORKSPACE_A}/doc/A/w/${WORKSPACE_B}/task/B`);
    });
  });

  describe('round-trip', () => {
    const cases: UrlPath.ParsedUrl[] = [
      { workspace: WORKSPACE_A, pairs: [] },
      { workspace: WORKSPACE_A, pairs: [{ key: 'doc', id: 'A', workspace: WORKSPACE_A }] },
      {
        workspace: WORKSPACE_A,
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'sheet', id: 'B', workspace: WORKSPACE_A },
        ],
      },
      {
        workspace: WORKSPACE_A,
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'comments', workspace: WORKSPACE_A },
        ],
      },
      {
        workspace: WORKSPACE_A,
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'task', id: 'B', workspace: WORKSPACE_B },
        ],
      },
      { workspace: '!dxos:settings', pairs: [{ key: 'doc', id: 'A', workspace: '!dxos:settings' }] },
    ];

    for (const parsedUrl of cases) {
      test(`${UrlPath.format(parsedUrl)} round-trips`, ({ expect }) => {
        const formatted = UrlPath.format(parsedUrl);
        const reparsed = UrlPath.parse(formatted, table);
        expect(Option.getOrThrow(reparsed)).toEqual(parsedUrl);
      });
    }
  });

  describe('isReservedKey', () => {
    test('reserves w', ({ expect }) => {
      expect(UrlPath.isReservedKey('w')).toBe(true);
    });

    test('reserves reset, redirect, not-found', ({ expect }) => {
      expect(UrlPath.isReservedKey('reset')).toBe(true);
      expect(UrlPath.isReservedKey('redirect')).toBe(true);
      expect(UrlPath.isReservedKey('not-found')).toBe(true);
    });

    test('reserves SpaceId-shaped segments', ({ expect }) => {
      // SpaceId shape: 'B' multibase prefix + 32 base32 characters (33 chars total).
      expect(UrlPath.isReservedKey(`B${'A'.repeat(32)}`)).toBe(true);
    });

    test('does not reserve an ordinary key', ({ expect }) => {
      expect(UrlPath.isReservedKey('doc')).toBe(false);
      expect(UrlPath.isReservedKey('collection')).toBe(false);
    });
  });
});
