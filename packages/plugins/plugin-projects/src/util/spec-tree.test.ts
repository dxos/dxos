//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Spec from '@dxos/compute/Spec';

import { specTree } from './spec-tree.ts';

describe('specTree', () => {
  test('lists each root followed by the specs nested beneath it, by name, to any depth', ({ expect }) => {
    const [inbox, talk, triage, compose, drafts] = ['Inbox', 'Talk', 'Triage', 'Compose', 'Drafts'].map((name) =>
      Spec.make({ name }),
    );
    const tree = specTree([inbox, talk, triage, compose, drafts], {
      roots: [inbox.id, talk.id],
      children: new Map([
        [inbox.id, [triage.id, compose.id]],
        [compose.id, [drafts.id]],
      ]),
    });
    expect(tree.map(({ spec, depth }) => [spec.name, depth])).toEqual([
      ['Inbox', 0],
      ['Compose', 1],
      ['Drafts', 2],
      ['Triage', 1],
      ['Talk', 0],
    ]);
  });

  test('lists a spec two specs cite once, under the first', ({ expect }) => {
    const [inbox, talk, shared] = ['Inbox', 'Talk', 'Shared'].map((name) => Spec.make({ name }));
    const tree = specTree([inbox, talk, shared], {
      roots: [inbox.id, talk.id],
      children: new Map([
        [inbox.id, [shared.id]],
        [talk.id, [shared.id]],
      ]),
    });
    expect(tree.map(({ spec, depth }) => [spec.name, depth])).toEqual([
      ['Inbox', 0],
      ['Shared', 1],
      ['Talk', 0],
    ]);
  });
});
