//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import { describe, test } from 'vitest';

import { type SpaceCapabilities } from '#types';

describe('VersioningState mode', () => {
  const makeVersioningAtom = () => Atom.make<SpaceCapabilities.VersioningState>({ selection: {}, view: {}, mode: {} });

  test('mode defaults to an empty map', ({ expect }) => {
    const registry = Registry.make();
    const atom = makeVersioningAtom();
    expect(registry.get(atom).mode).toEqual({});
  });

  test('setting mode round-trips per document id', ({ expect }) => {
    const registry = Registry.make();
    const atom = makeVersioningAtom();
    const next: SpaceCapabilities.ReviewMode = 'viewing';

    registry.update(atom, (current) => ({ ...current, mode: { ...current.mode, doc1: next } }));

    expect(registry.get(atom).mode.doc1).toEqual('viewing');
    expect(registry.get(atom).mode.doc2).toBeUndefined();
  });
});
