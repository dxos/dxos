//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { ViewState, createDefaultBackends } from '@dxos/react-ui-attention';

import * as CompanionViewState from './CompanionViewState.ts';

describe('CompanionViewState.aspect', () => {
  test('declares one local aspect for the selected variant, seeded to help', ({ expect }) => {
    expect(CompanionViewState.aspect.key).toEqual('deck-companion');
    expect(CompanionViewState.aspect.backend).toEqual('local');
    expect(CompanionViewState.aspect.defaultValue()).toEqual({ variant: 'help' });
  });

  test('a variant write round-trips through the manager', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });

    manager.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({ ...prev, variant: 'chat' }));
    expect(manager.get(CompanionViewState.aspect, CompanionViewState.CONTEXT)).toEqual({ variant: 'chat' });
  });

  test('a chosen tab replaces the seed rather than being re-asserted', ({ expect }) => {
    const registry = Registry.make();
    const manager = new ViewState.Manager({ registry, backends: createDefaultBackends(registry) });

    expect(manager.get(CompanionViewState.aspect, CompanionViewState.CONTEXT)).toEqual({ variant: 'help' });
    manager.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({ ...prev, variant: 'chat' }));
    expect(manager.get(CompanionViewState.aspect, CompanionViewState.CONTEXT)).toEqual({ variant: 'chat' });
  });
});
