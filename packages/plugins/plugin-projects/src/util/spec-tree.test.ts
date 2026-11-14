//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Ref } from '@dxos/echo';

import { nestSpecs } from './spec-tree.ts';

/** `child` nested beneath `parent` through an object between them, as another plugin's feature holds a breakdown. */
const nest = (parent: Spec.Spec, child: Spec.Spec) => {
  const between = Project.make({ name: 'Between', specs: [Ref.make(child)] });
  Obj.setParent(between, parent);
  Obj.setParent(child, between);
};

describe('nestSpecs', () => {
  test('lists each spec followed by the specs nested beneath it, by name, to any depth', ({ expect }) => {
    const inbox = Spec.make({ name: 'Inbox' });
    const talk = Spec.make({ name: 'Talk' });
    const triage = Spec.make({ name: 'Triage' });
    const compose = Spec.make({ name: 'Compose' });
    const drafts = Spec.make({ name: 'Drafts' });
    nest(inbox, triage);
    nest(inbox, compose);
    nest(compose, drafts);

    const tree = nestSpecs([inbox, talk], [talk, triage, drafts, compose, inbox]);
    expect(tree.map(({ spec, depth }) => [spec.name, depth])).toEqual([
      ['Inbox', 0],
      ['Compose', 1],
      ['Drafts', 2],
      ['Triage', 1],
      ['Talk', 0],
    ]);
  });

  test('leaves out specs nested beneath no spec of the project', ({ expect }) => {
    const inbox = Spec.make({ name: 'Inbox' });
    const elsewhere = Spec.make({ name: 'Elsewhere' });
    const stray = Spec.make({ name: 'Stray' });
    nest(elsewhere, stray);

    expect(nestSpecs([inbox], [inbox, elsewhere, stray]).map(({ spec }) => spec.name)).toEqual(['Inbox']);
  });
});
