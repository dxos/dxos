//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test } from 'vitest';

import * as UrlPath from './UrlPath.ts';

const table: UrlPath.KeyTable = new Map<string, UrlPath.KeyTableEntry>([
  // The workspace tier is a declared anchor key (see the workspace-anchor extension), not a hard-coded token.
  ['w', { key: 'w', hasId: true, anchor: true }],
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
      expect(Option.getOrThrow(parsed)).toEqual({ workspace: WORKSPACE_A, workspaceKey: 'w', pairs: [] });
    });

    test('tokenizes a single pair', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/01JGDOC`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        workspaceKey: 'w',
        pairs: [{ key: 'doc', id: '01JGDOC', workspace: WORKSPACE_A }],
      });
    });

    test('tokenizes a chain of pairs', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/sheet/B`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        workspaceKey: 'w',
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
        workspaceKey: 'w',
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'comments', workspace: WORKSPACE_A },
        ],
      });
    });

    test('mid-chain anchor pair rebases subsequent ids', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/w/${WORKSPACE_B}/task/B`, table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        workspaceKey: 'w',
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'task', id: 'B', workspace: WORKSPACE_B },
        ],
      });
    });

    test('a non-space workspace name', ({ expect }) => {
      const parsed = UrlPath.parse('/w/dxos:settings/doc/A', table);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: 'dxos:settings',
        workspaceKey: 'w',
        pairs: [{ key: 'doc', id: 'A', workspace: 'dxos:settings' }],
      });
    });

    test('a custom anchor key drives the leading pair', ({ expect }) => {
      const customTable: UrlPath.KeyTable = new Map<string, UrlPath.KeyTableEntry>([
        ['ws', { key: 'ws', hasId: true, anchor: true }],
        ['doc', { key: 'doc', hasId: true }],
      ]);
      const parsed = UrlPath.parse(`/ws/${WORKSPACE_A}/doc/A`, customTable);
      expect(Option.getOrThrow(parsed)).toEqual({
        workspace: WORKSPACE_A,
        workspaceKey: 'ws',
        pairs: [{ key: 'doc', id: 'A', workspace: WORKSPACE_A }],
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

    test('dangling anchor with no following workspace resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse(`/w/${WORKSPACE_A}/doc/A/w`, table);
      expect(Option.isNone(parsed)).toBe(true);
    });

    test('a leading key that is not a registered anchor resolves to none', ({ expect }) => {
      // `doc` is a registered key but not an anchor, so it cannot open the chain.
      const parsed = UrlPath.parse(`/doc/${WORKSPACE_A}/A`, table);
      expect(Option.isNone(parsed)).toBe(true);
    });

    test('missing workspace after leading anchor resolves to none', ({ expect }) => {
      const parsed = UrlPath.parse('/w', table);
      expect(Option.isNone(parsed)).toBe(true);
    });
  });

  describe('format', () => {
    test('emits workspace-only path', ({ expect }) => {
      expect(UrlPath.format({ workspace: WORKSPACE_A, workspaceKey: 'w', pairs: [] })).toBe(`/w/${WORKSPACE_A}`);
    });

    test('emits a single pair', ({ expect }) => {
      expect(
        UrlPath.format({
          workspace: WORKSPACE_A,
          workspaceKey: 'w',
          pairs: [{ key: 'doc', id: 'A', workspace: WORKSPACE_A }],
        }),
      ).toBe(`/w/${WORKSPACE_A}/doc/A`);
    });

    test('emits an id-less companion pair', ({ expect }) => {
      expect(
        UrlPath.format({
          workspace: WORKSPACE_A,
          workspaceKey: 'w',
          pairs: [
            { key: 'doc', id: 'A', workspace: WORKSPACE_A },
            { key: 'comments', workspace: WORKSPACE_A },
          ],
        }),
      ).toBe(`/w/${WORKSPACE_A}/doc/A/comments`);
    });

    test('inserts an anchor pair on workspace change', ({ expect }) => {
      expect(
        UrlPath.format({
          workspace: WORKSPACE_A,
          workspaceKey: 'w',
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
      { workspace: WORKSPACE_A, workspaceKey: 'w', pairs: [] },
      { workspace: WORKSPACE_A, workspaceKey: 'w', pairs: [{ key: 'doc', id: 'A', workspace: WORKSPACE_A }] },
      {
        workspace: WORKSPACE_A,
        workspaceKey: 'w',
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'sheet', id: 'B', workspace: WORKSPACE_A },
        ],
      },
      {
        workspace: WORKSPACE_A,
        workspaceKey: 'w',
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'comments', workspace: WORKSPACE_A },
        ],
      },
      {
        workspace: WORKSPACE_A,
        workspaceKey: 'w',
        pairs: [
          { key: 'doc', id: 'A', workspace: WORKSPACE_A },
          { key: 'task', id: 'B', workspace: WORKSPACE_B },
        ],
      },
      { workspace: 'dxos:settings', workspaceKey: 'w', pairs: [{ key: 'doc', id: 'A', workspace: 'dxos:settings' }] },
    ];

    for (const parsedUrl of cases) {
      test(`${UrlPath.format(parsedUrl)} round-trips`, ({ expect }) => {
        const formatted = UrlPath.format(parsedUrl);
        const reparsed = UrlPath.parse(formatted, table);
        expect(Option.getOrThrow(reparsed)).toEqual(parsedUrl);
      });
    }
  });

  describe('readWorkspace', () => {
    test('reads the leading workspace without a key table', ({ expect }) => {
      expect(Option.getOrThrow(UrlPath.readWorkspace(`/w/${WORKSPACE_A}`))).toBe(WORKSPACE_A);
    });

    test('reads it from a chain whose later keys are unregistered', ({ expect }) => {
      expect(Option.getOrThrow(UrlPath.readWorkspace(`/w/${WORKSPACE_A}/unknown/abc`))).toBe(WORKSPACE_A);
      expect(Option.isNone(UrlPath.parse(`/w/${WORKSPACE_A}/unknown/abc`, table))).toBe(true);
    });

    test('rejects a path that does not open with the anchor key', ({ expect }) => {
      expect(Option.isNone(UrlPath.readWorkspace('/'))).toBe(true);
      expect(Option.isNone(UrlPath.readWorkspace('/doc/abc'))).toBe(true);
      expect(Option.isNone(UrlPath.readWorkspace('/w'))).toBe(true);
    });

    test('rejects a malformed encoding rather than throwing', ({ expect }) => {
      expect(Option.isNone(UrlPath.readWorkspace('/w/%'))).toBe(true);
      expect(Option.isNone(UrlPath.parse('/w/%', table))).toBe(true);
    });
  });

  describe('readReferences', () => {
    const SPACE_A = `B${'A'.repeat(32)}`;
    const SPACE_B = `B${'B'.repeat(32)}`;
    const OBJECT_1 = '01JGDXC0000000000000000001';
    const OBJECT_2 = '01JGDXC0000000000000000002';

    test('reads object ids under their keys, across workspace rebases and tail-joined ids', ({ expect }) => {
      const references = UrlPath.readReferences(
        `/w/${SPACE_A}/doc/${OBJECT_1}/comments/w/${SPACE_B}/db/contact+${OBJECT_2}`,
      );
      expect(references).toEqual([
        { key: 'doc', entityId: OBJECT_1, workspace: SPACE_A },
        { key: 'db', entityId: OBJECT_2, workspace: SPACE_B },
      ]);
    });

    test('a tail names its ancestors first, so the last id is the object', ({ expect }) => {
      expect(UrlPath.readReferences(`/w/${SPACE_A}/message/${OBJECT_1}+${OBJECT_2}`)).toEqual([
        { key: 'message', entityId: OBJECT_2, workspace: SPACE_A },
      ]);
    });

    test('none for a pathname outside the grammar', ({ expect }) => {
      expect(UrlPath.readReferences(`/doc/${OBJECT_1}`)).toEqual([]);
      expect(UrlPath.readReferences('/w/%')).toEqual([]);
    });
  });

  describe('isReservedKey', () => {
    test('does not reserve w (it is a declared anchor key)', ({ expect }) => {
      expect(UrlPath.isReservedKey('w')).toBe(false);
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

  describe('withTitle', () => {
    const base = new URL('https://composer.space/w/space/doc/1?debug=1');

    test('appends the title, keeping other parameters', ({ expect }) => {
      const url = UrlPath.withTitle(base, '  Quarterly   plan ');
      expect(url.searchParams.get(UrlPath.TITLE_PARAM)).toBe('Quarterly plan');
      expect(url.searchParams.get('debug')).toBe('1');
      expect(base.searchParams.has(UrlPath.TITLE_PARAM)).toBe(false);
    });

    test('truncates a long title with an ellipsis', ({ expect }) => {
      const title = UrlPath.withTitle(base, 'x'.repeat(200)).searchParams.get(UrlPath.TITLE_PARAM);
      expect([...(title ?? '')].length).toBe(UrlPath.MAX_TITLE_LENGTH);
      expect(title?.endsWith('…')).toBe(true);
    });

    test('removes the parameter when there is no title', ({ expect }) => {
      const titled = UrlPath.withTitle(base, 'Plan');
      expect(UrlPath.withTitle(titled, '   ').searchParams.has(UrlPath.TITLE_PARAM)).toBe(false);
      expect(UrlPath.withTitle(titled, undefined).searchParams.has(UrlPath.TITLE_PARAM)).toBe(false);
    });
  });
});
