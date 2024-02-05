//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Repo } from '@dxos/automerge/automerge-repo';
import { describe, test } from '@dxos/test';

describe('AutomergeRepo', () => {
  test('change events', () => {
    const repo = new Repo({ network: [] });
    const handle = repo.create<{ field?: string }>();

    let valueDuringChange: string | undefined;

    handle.addListener('change', (doc) => {
      valueDuringChange = handle.docSync().field;
    });

    handle.change((doc: any) => {
      doc.field = 'value';
    });

    expect(valueDuringChange).to.eq('value');
  });
});
